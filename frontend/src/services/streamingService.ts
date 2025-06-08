export interface StreamingServiceConfig {
  apiBaseURL: string;
  getAuthToken: () => string | null;
}

export interface StreamError {
  type:
    | "auth_error"
    | "http_error"
    | "parsing_error"
    | "connection_error"
    | "user_cancelled";
  message: string;
  details?: Record<string, any>;
}

export interface ToolCall {
  name: string;
  result: any;
}

export class StreamingService {
  private config: StreamingServiceConfig;
  private abortController: AbortController | null = null;

  constructor(config: StreamingServiceConfig) {
    this.config = config;
  }

  async streamCompletion(
    conversationId: string,
    userMessage: string,
    model: string = "idk",
    onUpdate: (content: string, toolCalls: ToolCall[]) => void,
    onComplete: (
      messageId: string,
      content: string,
      toolCalls: ToolCall[],
    ) => void,
    onError: (error: StreamError) => void,
  ): Promise<void> {
    // Cancel any existing request
    this.cancel();
    this.abortController = new AbortController();

    // Message state
    const messageParts: string[] = [""];
    const toolCalls: ToolCall[] = [];
    let messageId: string | null = null;

    try {
      const token = this.config.getAuthToken();
      if (!token) {
        throw { type: "auth_error", message: "Authentication token not found" };
      }

      // Build URL
      const url = new URL(`${this.config.apiBaseURL}/c/completion`);
      url.searchParams.append("user_message", userMessage);
      url.searchParams.append("model", model);
      url.searchParams.append("conv_id", conversationId);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw {
          type: "http_error",
          message:
            errorData.message || `HTTP error! status: ${response.status}`,
          details: { status: response.status, ...errorData },
        };
      }

      const reader = response.body?.getReader();
      if (!reader)
        throw { type: "connection_error", message: "Response body is null" };

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete events
        let eventEnd;
        while ((eventEnd = buffer.indexOf("\n\n")) >= 0) {
          const eventData = buffer.substring(0, eventEnd);
          buffer = buffer.substring(eventEnd + 2);

          const { eventType, eventContent } = this.parseSSEEvent(eventData);

          if (eventContent === "[DONE]") continue;

          try {
            if (eventType === "delta") {
              const delta = JSON.parse(eventContent);

              // Handle initial message
              if (delta.o === "add" && delta.v?.message) {
                messageId = delta.v.message.id;
                if (delta.v.message.metadata?.tool_call) {
                  toolCalls.push(...delta.v.message.metadata.tool_call);
                }
              }
              // Handle content append
              else if (
                delta.o === "append" &&
                delta.p?.includes("/content/parts/")
              ) {
                const partIndex = this.extractPartIndex(delta.p);
                while (messageParts.length <= partIndex) messageParts.push("");
                messageParts[partIndex] += delta.v;
                onUpdate(messageParts.join(""), toolCalls);
              }
              // Handle tool call append
              else if (
                delta.o === "append" &&
                delta.p === "/message/metadata/tool_call" &&
                delta.v?.name
              ) {
                toolCalls.push(delta.v);
                onUpdate(messageParts.join(""), toolCalls);
              }
              // Handle patch operations
              else if (delta.o === "patch" && Array.isArray(delta.v)) {
                for (const patch of delta.v) {
                  if (patch.p === "/error" && patch.o === "replace") {
                    throw {
                      type: patch.v.type || "connection_error",
                      message:
                        patch.v.message ||
                        "An error occurred during response generation",
                      details: patch.v.details,
                    };
                  }
                  if (
                    patch.p?.includes("/content/parts/") &&
                    patch.o === "append"
                  ) {
                    const partIndex = this.extractPartIndex(patch.p);
                    while (messageParts.length <= partIndex)
                      messageParts.push("");
                    messageParts[partIndex] += patch.v;
                  }
                }
                onUpdate(messageParts.join(""), toolCalls);
              }
            }
          } catch (e) {
            console.error("Error processing event:", e);
          }
        }
      }

      // Stream complete
      onComplete(
        messageId || `temp-${Date.now()}`,
        messageParts.join(""),
        toolCalls,
      );
      // NOTE: FIX THIS ANY
      // eslint-disable-next-line
    } catch (error: any) {
      if (error.name === "AbortError") {
        onError({ type: "user_cancelled", message: "Request cancelled" });
      } else if (error.type) {
        onError(error);
      } else {
        onError({
          type: "connection_error",
          message: error.message || "Connection error",
          details: { error: error.message },
        });
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private parseSSEEvent(eventData: string): {
    eventType: string;
    eventContent: string;
  } {
    const lines = eventData.split("\n");
    let eventType = "";
    let eventContent = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.substring(7);
      } else if (line.startsWith("data: ")) {
        eventContent = line.substring(6);
      }
    }

    return { eventType, eventContent };
  }

  private extractPartIndex(path: string): number {
    const match = path.match(/\/parts\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}

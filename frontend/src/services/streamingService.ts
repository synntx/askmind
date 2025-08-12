import { StreamError, ToolCall } from "@/types/streaming";

/**
 * Configuration for the StreamingService.
 */
export interface StreamingServiceConfig {
  apiBaseURL: string;
  getAuthToken: () => string | null;
}

/**
 * Represents the raw structure of a parsed SSE event.
 * @internal
 */
interface SSEEvent {
  event: string;
  data: string;
}

/**
 * Represents the internal state of the message being streamed.
 * @internal
 */
interface StreamingMessageState {
  messageId: string | null;
  conversationId: string;
  contentParts: string[];
  toolCalls: ToolCall[];
}

/**
 * Type guard to check if an error is a StreamError.
 * @internal
 */
function isStreamError(error: unknown): error is StreamError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error
  );
}

/**
 * Manages low-level communication for streaming chat completions via Server-Sent Events (SSE).
 */
export class StreamingService {
  private config: StreamingServiceConfig;
  private abortController: AbortController | null = null;

  constructor(config: StreamingServiceConfig) {
    this.config = config;
  }

  /**
   * Initiates a streaming completion request.
   *
   * @param conversationId - The ID of the conversation.
   * @param userMessage - The message from the user.
   * @param model - The model to use for the completion.
   * @param onUpdate - Callback fired with the latest content and tool calls.
   * @param onComplete - Callback fired when the stream successfully finishes.
   * @param onError - Callback fired when any error occurs.
   */
  public async streamCompletion(
    conversationId: string,
    spaceId: string,
    userMessage: string,
    model: string,
    provider: string,
    systemPrompt: string,
    onUpdate: (content: string, toolCalls: ToolCall[]) => void,
    onComplete: (
      messageId: string,
      content: string,
      toolCalls: ToolCall[],
      conversationId: string,
    ) => void,
    onError: (error: StreamError) => void,
  ): Promise<void> {
    this.cancel();
    this.abortController = new AbortController();

    const state: StreamingMessageState = {
      messageId: null,
      conversationId: conversationId,
      contentParts: [""],
      toolCalls: [],
    };

    try {
      const response = await this.initiateFetch(
        conversationId,
        spaceId,
        userMessage,
        model,
        provider,
        systemPrompt,
      );
      await this.processStream(response, state, onUpdate, onError);

      if (!state.messageId) {
        throw {
          type: "parsing_error",
          message: "Stream completed without providing a message ID.",
        };
      }

      onComplete(
        state.messageId,
        state.contentParts.join(""),
        state.toolCalls,
        state.conversationId,
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        onError({
          type: "user_cancelled",
          message: "Request cancelled by user.",
        });
      } else if (isStreamError(error)) {
        onError(error);
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unknown connection error occurred.";
        onError({
          type: "connection_error",
          message: errorMessage,
          details: { originalError: error },
        });
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Cancels the current streaming request, if one is active.
   */
  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Prepares and sends the initial fetch request.
   * @internal
   */
  private async initiateFetch(
    conversationId: string,
    spaceId: string,
    userMessage: string,
    model: string,
    provider: string,
    systemPrompt: string,
  ): Promise<Response> {
    const token = this.config.getAuthToken();
    if (!token) {
      throw { type: "auth_error", message: "Authentication token not found." };
    }

    const url = `${this.config.apiBaseURL}/c/completion`;

    const formData = new URLSearchParams();
    formData.append("conv_id", conversationId);
    formData.append("space_id", spaceId);
    formData.append("user_message", userMessage);
    formData.append("model", model);
    formData.append("provider", provider);
    formData.append("system_prompt", systemPrompt);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: formData.toString(),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        type: "http_error",
        message: `Server responded with status ${response.status}`,
        details: { status: response.status, ...errorData },
      };
    }

    return response;
  }

  /**
   * Reads and processes the SSE stream from the response body.
   * @internal
   */
  private async processStream(
    response: Response,
    state: StreamingMessageState,
    onUpdate: (content: string, toolCalls: ToolCall[]) => void,
    onError: (error: StreamError) => void,
  ) {
    if (!response.body) {
      throw { type: "connection_error", message: "Response body is missing." };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process all complete events in the buffer
      const events = this.parseSSEBuffer(buffer);
      if (events.processedLength > 0) {
        buffer = buffer.slice(events.processedLength);
      }

      for (const event of events.sseEvents) {
        try {
          this.handleSSEEvent(event, state, onError);
          // Notify consumer of the update after applying the delta
          onUpdate(state.contentParts.join(""), [...state.toolCalls]);
        } catch (e) {
          console.error("Error processing SSE event:", e);
        }
      }
    }
  }

  /**
   * Parses a buffer of SSE data and extracts complete events.
   * Returns parsed events and the length of the buffer that was processed.
   * @internal
   */
  private parseSSEBuffer(buffer: string): {
    sseEvents: SSEEvent[];
    processedLength: number;
  } {
    const sseEvents: SSEEvent[] = [];
    let processedLength = 0;

    const eventSeparator = "\n\n";
    let eventEndIndex;

    while (
      (eventEndIndex = buffer.indexOf(eventSeparator, processedLength)) !== -1
    ) {
      const eventStartIndex = processedLength;
      processedLength = eventEndIndex + eventSeparator.length;
      const eventData = buffer.substring(eventStartIndex, eventEndIndex);

      const lines = eventData.split("\n");
      const event: SSEEvent = { event: "message", data: "" }; // 'message' is the default event type
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event.event = line.substring(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.substring(5).trim());
        }
      }
      event.data = dataLines.join("\n"); // In case of multi-line data
      sseEvents.push(event);
    }

    return { sseEvents, processedLength };
  }

  /**
   * Handles a single parsed SSE event and updates the streaming state.
   * @internal
   */
  private handleSSEEvent(
    event: SSEEvent,
    state: StreamingMessageState,
    onError: (error: StreamError) => void,
  ) {
    if (event.event === "error") {
      try {
        const errorDetails = JSON.parse(event.data);
        onError({
          type: errorDetails.type || "generation_error",
          message: errorDetails.message || "An error occurred on the server.",
          details: errorDetails.details,
        });
      } catch {
        onError({
          type: "parsing_error",
          message: "Could not parse error event from server.",
        });
      }
      return;
    }

    if (event.event === "delta") {
      try {
        const delta = JSON.parse(event.data);
        this.applyDelta(state, delta);
      } catch (e) {
        console.error("Failed to parse delta JSON:", event.data, e);
        // Optionally, inform the user via onError callback
        onError({
          type: "parsing_error",
          message: "Received malformed data from the server.",
        });
      }
    }
    // Ignore other event types like 'delta_encoding' and 'completion' as they don't affect message state.
  }

  /**
   * Applies a delta patch from the server to the message state.
   * Based on the backend's patch structure.
   * @internal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyDelta(state: StreamingMessageState, delta: any) {
    const op = delta.o; // operation
    const path = delta.p; // path
    const value = delta.v; // value

    switch (op) {
      case "add":
        // This is the initial message payload
        if (value?.message?.id) {
          state.messageId = value.message.id;
        }

        if (value?.conversation_id) {
          state.conversationId = value.conversation_id;
        }

        if (value?.message?.metadata?.tool_call) {
          state.toolCalls.push(...value.message.metadata.tool_call);
        }
        break;

      case "append":
        if (path === "/message/metadata/tool_call" && value?.name) {
          state.toolCalls.push(value);
        } else if (path?.startsWith("/message/content/parts/")) {
          const partIndex = this.extractPartIndex(path);
          while (state.contentParts.length <= partIndex) {
            state.contentParts.push("");
          }
          state.contentParts[partIndex] += value;
        }
        break;

      case "patch":
        if (Array.isArray(value)) {
          value.forEach((patchOp) => this.applyDelta(state, patchOp));
        }
        break;

      case "replace":
        if (path.startsWith("/message/metadata/tool_call/")) {
          const toolIndex = this.extractToolIndex(path);
          if (toolIndex !== null && toolIndex < state.toolCalls.length) {
            state.toolCalls[toolIndex] = {
              ...state.toolCalls[toolIndex],
              ...value,
            };
          }
        } else if (path === "/message/content/parts") {
          const partIndex = this.extractPartIndex(path);
          if (partIndex < state.contentParts.length) {
            state.contentParts[partIndex] = value;
          }
          state.contentParts[partIndex] += value;
        } else if (path === "/message/metadata/tool_call" && value?.name) {
          state.toolCalls.push(value);
        }
    }
  }

  private extractToolIndex(path: string): number | null {
    const match = path.match(/\/tool_call\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Extracts the part index from a JSON patch path string.
   * e.g., "/message/content/parts/0" -> 0
   * @internal
   */
  private extractPartIndex(path: string): number {
    const match = path.match(/\/parts\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

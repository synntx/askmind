import { useState, useCallback, useRef, useEffect } from "react";

interface Message {
  message_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  tokens_used: number;
  model: string;
  created_at: string;
  updated_at: string;
}

// Add structured error interface
interface StreamError {
  type: string;
  message: string;
  details?: {
    conv_id?: string;
    recovery_suggestions?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

type PartialMessage = Partial<Message>;

interface UseStreamingCompletionProps {
  conv_id: string;
  apiBaseURL: string;
  updateMessageCache: (message: PartialMessage) => void;
}

export const useStreamingCompletion = ({
  conv_id,
  apiBaseURL,
  updateMessageCache,
}: UseStreamingCompletionProps) => {
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  // Enhanced error state with structured information
  const [error, setError] = useState<StreamError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reference to store message parts for delta updates
  const messagePartsRef = useRef<string[]>([""]);
  // Reference to store current message ID
  const messageIdRef = useRef<string | null>(null);

  const getCompletion = useCallback(
    async (userMessage: string): Promise<void> => {
      setIsPending(true);
      setError(null);
      setStreamingResponse("");
      messagePartsRef.current = [""]; // Reset message parts
      messageIdRef.current = null; // Reset message ID

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Add user message to cache immediately
      const userMessageObj: PartialMessage = {
        message_id: `temp-user-${Date.now()}`,
        conversation_id: conv_id,
        role: "user",
        content: userMessage,
        tokens_used: 0,
        model: "idk",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updateMessageCache(userMessageObj);

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Authentication token not found");
        }

        // Build URL with query parameters
        const url = new URL(`${apiBaseURL}/c/completion`);
        url.searchParams.append("user_message", userMessage);
        url.searchParams.append("model", "idk");
        url.searchParams.append("conv_id", conv_id);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          // Enhanced HTTP error handling
          try {
            const errorData = await response.json();
            setError({
              type: "http_error",
              message:
                errorData.message || `HTTP error! status: ${response.status}`,
              details: {
                status: response.status,
                ...errorData,
              },
            });
          } catch {
            // If response isn't JSON, use text instead
            const errorText = await response.text();
            setError({
              type: "http_error",
              message: `HTTP error! status: ${response.status}`,
              details: {
                status: response.status,
                responseText: errorText,
              },
            });
          }
          setIsPending(false);
          return;
        }

        // Process the stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is null");
        }

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

            // Process the event
            const eventLines = eventData.split("\n");
            let eventType = "";
            let eventContent = "";

            for (const line of eventLines) {
              if (line.startsWith("event: ")) {
                eventType = line.substring(7);
              } else if (line.startsWith("data: ")) {
                eventContent = line.substring(6);
              }
            }

            if (eventContent === "[DONE]") {
              continue;
            }

            try {
              // Process based on event type
              if (eventType === "delta_encoding") {
                // Just acknowledge the protocol version
                console.log(
                  "Delta encoding protocol established:",
                  eventContent,
                );
              } else if (eventType === "delta") {
                const deltaData = JSON.parse(eventContent);

                // Handle initial message structure
                if (deltaData.o === "add" && deltaData.v?.message) {
                  // Store the message ID for later use
                  messageIdRef.current = deltaData.v.message.id;
                }
                // Handle append operations
                else if (
                  deltaData.o === "append" &&
                  deltaData.p?.includes("/content/parts/")
                ) {
                  // Extract the part index from the path
                  const pathMatch = deltaData.p.match(/\/parts\/(\d+)/);
                  const partIndex = pathMatch ? parseInt(pathMatch[1]) : 0;

                  // Ensure the array has enough elements
                  while (messagePartsRef.current.length <= partIndex) {
                    messagePartsRef.current.push("");
                  }

                  // Append the text
                  messagePartsRef.current[partIndex] += deltaData.v;

                  // Update the streaming response
                  const fullText = messagePartsRef.current.join("");
                  setStreamingResponse(fullText);
                }
                // Handle patch operations (multiple updates)
                else if (
                  deltaData.o === "patch" &&
                  Array.isArray(deltaData.v)
                ) {
                  // Check for error events first
                  let hasError = false;
                  for (const patch of deltaData.v) {
                    if (patch.p === "/error" && patch.o === "replace") {
                      hasError = true;
                      const errorInfo = patch.v;
                      setError({
                        type: errorInfo.type || "unknown_error",
                        message:
                          errorInfo.message ||
                          "An error occurred during response generation",
                        details: errorInfo.details || {},
                      });

                      // If there was partial content, we can use it as an error message
                      if (messagePartsRef.current[0]) {
                        // Add partial assistant message with error info to cache
                        const errorMsg =
                          "**Note**: Response generation was interrupted: " +
                          errorInfo.message;

                        const assistantMessageObj: PartialMessage = {
                          message_id:
                            messageIdRef.current || `error-${Date.now()}`,
                          conversation_id: conv_id,
                          role: "assistant",
                          content:
                            messagePartsRef.current[0] + "\n\n" + errorMsg,
                          tokens_used: 0,
                          model: "idk",
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        };
                        updateMessageCache(assistantMessageObj);
                      }
                      setIsPending(false);
                      break;
                    }
                  }

                  if (hasError) break;

                  // If no error, process content patches
                  for (const patch of deltaData.v) {
                    if (
                      patch.p?.includes("/content/parts/") &&
                      patch.o === "append"
                    ) {
                      const pathMatch = patch.p.match(/\/parts\/(\d+)/);
                      const partIndex = pathMatch ? parseInt(pathMatch[1]) : 0;

                      while (messagePartsRef.current.length <= partIndex) {
                        messagePartsRef.current.push("");
                      }

                      messagePartsRef.current[partIndex] += patch.v;
                    }
                  }

                  const fullText = messagePartsRef.current.join("");
                  setStreamingResponse(fullText);
                }
              }
              // Handle completion event
              else if (
                eventType === "" &&
                eventContent.includes("message_stream_complete")
              ) {
                // Stream is complete
                break;
              }
            } catch (e) {
              console.error(
                "Error processing event:",
                e,
                "Event content:",
                eventContent,
              );
              setError({
                type: "parsing_error",
                message: "Error processing response data",
                details: {
                  eventContent,
                  error: e instanceof Error ? e.message : String(e),
                },
              });
            }
          }
        }

        // If we didn't encounter any error, finalize the message
        if (!error) {
          const finalMessage = messagePartsRef.current.join("");

          // Add assistant message to cache after stream completes
          const assistantMessageObj: PartialMessage = {
            message_id: messageIdRef.current || `temp-assistant-${Date.now()}`,
            conversation_id: conv_id,
            role: "assistant",
            content: finalMessage,
            tokens_used: 0,
            model: "idk",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updateMessageCache(assistantMessageObj);
        }

        setStreamingResponse(""); // Clear streaming response
      } catch (err) {
        // Don't show aborted request errors
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("Error getting completion:", errorMessage);

        setError({
          type: "connection_error",
          message: "Error getting response. Please try again.",
          details: {
            error: errorMessage,
            recovery_suggestions: [
              "Check your internet connection",
              "Try refreshing the page",
              "The error may be temporary, try again in a moment",
            ],
          },
        });
        setStreamingResponse(""); // Clear on error
      } finally {
        setIsPending(false);
        abortControllerRef.current = null;
      }
    },
    [conv_id, apiBaseURL, updateMessageCache, error],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    streamingResponse,
    isPending,
    error,
    getCompletion,
    cancelCompletion: useCallback(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsPending(false);
        setError({
          type: "user_cancelled",
          message: "Request cancelled by user",
          details: {},
        });
      }
    }, []),
    // Add a method to clear errors
    clearError: useCallback(() => {
      setError(null);
    }, []),
  };
};

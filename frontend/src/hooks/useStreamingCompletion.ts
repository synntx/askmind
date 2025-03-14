import { useState, useCallback } from "react";

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
  const [error, setError] = useState<string | null>(null);

  const getCompletion = useCallback(
    async (userMessage: string): Promise<void> => {
      setIsPending(true);
      setError(null);
      setStreamingResponse("");

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
        let accumulatedMessage = "";
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${apiBaseURL}/c/completion?user_message=${encodeURIComponent(
            userMessage,
          )}&model=idk&conv_id=${conv_id}`,
          {
            method: "POST",
            headers: {
              Accept: "text/event-stream",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is null");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Append new data to buffer
          buffer += decoder.decode(value, { stream: true });

          /*
          data: matches the literal SSE data prefix
          (.*?) captures the actual data content (non-greedy to avoid over-matching)
          (?:\r\n|\n\n|\r\r) matches different possible event terminators:
          \r\n - Windows-style line ending followed by a blank line
          \n\n - Two newlines (standard SSE event separator)
          \r\r - Alternative event separator
          The g flag makes it find all matches in the string
          */

          // Process complete events
          const eventRegex = /data: (.*?)(?:\r\n|\n\n|\r\r)/g;
          let match;

          // Reset buffer if we've processed all complete events
          let lastIndex = 0;

          while ((match = eventRegex.exec(buffer)) !== null) {
            const data = match[1];
            lastIndex = match.index + match[0].length;

            // Skip [DONE] message
            if (data === "[DONE]") continue;

            // Add chunk to accumulated message
            accumulatedMessage += data;
            setStreamingResponse(accumulatedMessage);
          }

          // Keep the unprocessed part in the buffer
          buffer = buffer.substring(lastIndex);

          // If there's remaining data but no complete event, check for single data line
          if (buffer.length > 0 && buffer.includes("data: ")) {
            const dataMatch = buffer.match(/data: (.*?)(?:\r\n|\n|\r)/);
            if (dataMatch && dataMatch.index !== undefined) {
              const data = dataMatch[1];
              if (data !== "[DONE]") {
                accumulatedMessage += data;
                setStreamingResponse(accumulatedMessage);
              }
              buffer = buffer.substring(dataMatch.index + dataMatch[0].length);
            }
          }
        }

        // Add assistant message to cache after stream completes
        const assistantMessageObj: PartialMessage = {
          message_id: `temp-assistant-${Date.now()}`,
          conversation_id: conv_id,
          role: "assistant",
          content: accumulatedMessage,
          tokens_used: 0,
          model: "idk",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        updateMessageCache(assistantMessageObj);

        setStreamingResponse(""); // Clear streaming response
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("Error getting completion:", errorMessage);
        setError("Error getting response. Please try again.");
        setStreamingResponse(""); // Clear on error
        setTimeout(() => setError(null), 3000); // Clear error after 3s
      } finally {
        setIsPending(false);
      }
    },
    [conv_id, apiBaseURL, updateMessageCache],
  );

  return { streamingResponse, isPending, error, getCompletion };
};

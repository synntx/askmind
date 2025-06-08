import { useState, useCallback, useRef, useEffect } from "react";
import {
  StreamingService,
  StreamError,
  ToolCall,
} from "@/services/streamingService";
import { Message } from "@/types/message";

interface UseStreamingChatProps {
  conversationId: string;
  apiBaseURL: string;
  onMessageUpdate: (message: Partial<Message>) => void;
}

export const useStreamingChat = ({
  conversationId,
  apiBaseURL,
  onMessageUpdate,
}: UseStreamingChatProps) => {
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<StreamError | null>(null);

  const serviceRef = useRef<StreamingService | null>(null);
  const currentToolCallsRef = useRef<ToolCall[]>([]);

  // Initialize service
  useEffect(() => {
    serviceRef.current = new StreamingService({
      apiBaseURL,
      getAuthToken: () => localStorage.getItem("token"),
    });

    return () => {
      serviceRef.current?.cancel();
    };
  }, [apiBaseURL]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!serviceRef.current || isStreaming) return;

      setIsStreaming(true);
      setError(null);
      setStreamingContent("");
      currentToolCallsRef.current = [];

      // Add user message immediately
      const userMsg: Partial<Message> = {
        message_id: `temp-user-${Date.now()}`,
        conversation_id: conversationId,
        role: "user",
        content: userMessage,
        tokens_used: 0,
        model: "idk",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onMessageUpdate(userMsg);

      try {
        await serviceRef.current.streamCompletion(
          conversationId,
          userMessage,
          "idk",
          // onUpdate
          (content: string, toolCalls: ToolCall[]) => {
            setStreamingContent(content);
            currentToolCallsRef.current = toolCalls;
          },
          // onComplete
          (messageId: string, content: string, toolCalls: ToolCall[]) => {
            const assistantMsg: Partial<Message> = {
              message_id: messageId,
              conversation_id: conversationId,
              role: "assistant",
              content,
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
              tokens_used: 0,
              model: "idk",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            onMessageUpdate(assistantMsg);
            setStreamingContent("");
            setIsStreaming(false);
          },
          // onError
          (error: StreamError) => {
            setError(error);
            setIsStreaming(false);

            // Save partial response if any
            if (streamingContent) {
              const partialMsg: Partial<Message> = {
                message_id: `error-${Date.now()}`,
                conversation_id: conversationId,
                role: "assistant",
                content: streamingContent + "\n\n**Error:** " + error.message,
                tool_calls:
                  currentToolCallsRef.current.length > 0
                    ? currentToolCallsRef.current
                    : undefined,
                tokens_used: 0,
                model: "idk",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              onMessageUpdate(partialMsg);
            }
            setStreamingContent("");
          },
        );
      } catch (err) {
        setError({
          type: "connection_error",
          message: "Failed to send message",
          details: { error: err },
        });
        setIsStreaming(false);
      }
    },
    [conversationId, isStreaming, onMessageUpdate, streamingContent],
  );

  const cancelStream = useCallback(() => {
    serviceRef.current?.cancel();
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearError,
  };
};

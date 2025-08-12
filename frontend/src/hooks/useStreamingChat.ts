import { useState, useCallback, useRef, useEffect } from "react";
import { StreamError, ToolCall } from "@/types/streaming";
import { Message } from "@/types/streaming";
import { StreamingService } from "@/services/streamingService";

interface UseStreamingChatProps {
  conversationId: string;
  spaceId: string;
  apiBaseURL: string;
  onMessageUpdate: (message: Partial<Message>) => void;
  onNewConversation?: (newConversationId: string) => void;
}

export const useStreamingChat = ({
  conversationId,
  spaceId,
  apiBaseURL,
  onMessageUpdate,
  onNewConversation,
}: UseStreamingChatProps) => {
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<StreamError | null>(null);
  const [streamedToolCalls, setStreamedToolCalls] = useState<ToolCall[]>([]);

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
    async (
      userMessage: string,
      model: string,
      provider: string,
      systemPrompt: string,
    ) => {
      if (!serviceRef.current || isStreaming) return;

      setIsStreaming(true);
      setError(null);
      setStreamingContent("");
      setStreamedToolCalls([]);
      currentToolCallsRef.current = [];

      const userMsg: Partial<Message> = {
        message_id: `temp-user-${Date.now()}`,
        conversation_id: conversationId,
        role: "user",
        content: userMessage,
        tokens_used: 0,
        model: model,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onMessageUpdate(userMsg);

      try {
        await serviceRef.current.streamCompletion(
          conversationId,
          spaceId,
          userMessage,
          model,
          provider,
          systemPrompt,
          // onUpdate: called with streaming content and any tool calls
          (content: string, toolCalls: ToolCall[]) => {
            setStreamingContent(content);
            setStreamedToolCalls(toolCalls);
            currentToolCallsRef.current = toolCalls;
          },
          // onComplete: called when streaming finishes
          (
            messageId: string,
            content: string,
            toolCalls: ToolCall[],
            newConversationId: string,
          ) => {
            const finalConversationId = newConversationId || conversationId;
            const assistantMsg: Partial<Message> = {
              message_id: messageId,
              conversation_id: finalConversationId,
              role: "assistant",
              content,
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
              tokens_used: 0,
              model: model,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            onMessageUpdate(assistantMsg);
            setStreamingContent("");
            setStreamedToolCalls([]);
            setIsStreaming(false);

            if (
              conversationId === "new" &&
              newConversationId &&
              onNewConversation
            ) {
              onNewConversation(newConversationId);
            }
          },
          // onError: called when streaming errors
          (error: StreamError) => {
            setError(error);
            setIsStreaming(false);

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
                model: model,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              onMessageUpdate(partialMsg);
            }
            setStreamingContent("");
            setStreamedToolCalls([]);
          },
        );
      } catch (err) {
        // Catch any errors from calling streamCompletion itself (e.g., network issues)
        setError({
          type: "connection_error",
          message: "Failed to send message",
          details: { error: err },
        });
        setIsStreaming(false);
        setStreamedToolCalls([]);
      }
    },
    [
      conversationId,
      isStreaming,
      onMessageUpdate,
      streamingContent,
      onNewConversation,
      spaceId,
    ],
  );

  const cancelStream = useCallback(() => {
    serviceRef.current?.cancel();

    setIsStreaming(false);
    setStreamingContent("");
    setStreamedToolCalls([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    streamingContent,
    isStreaming,
    error,
    streamedToolCalls,
    sendMessage,
    cancelStream,
    clearError,
  };
};

"use client";

import React, { useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useGetConvMessages } from "@/hooks/useMessage";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/toast";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Message } from "@/types/streaming";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useConversationContext } from "@/contexts/ConversationContext";

const Conversation: React.FC = () => {
  const { conv_id, space_id }: { conv_id: string; space_id: string } =
    useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const queryClient = useQueryClient();
  const apiBaseURL = api.defaults.baseURL || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toast = useToast();
  const { selectedModel, selectedProvider, systemPrompt } =
    useConversationContext();

  const handleNewConversation = (newConversationId: string) => {
    const currentPath = `/space/${space_id}/c/${newConversationId}`;
    router.replace(currentPath, { scroll: false });

    const oldData = queryClient.getQueryData<Message[]>(["new"]);
    if (oldData) {
      queryClient.setQueryData<Message[]>([newConversationId], oldData);
      queryClient.removeQueries({ queryKey: ["new"] });
    }
  };

  const updateMessageCache = (newMessage: Partial<Message>) => {
    queryClient.setQueryData<Message[]>([conv_id], (oldData) => {
      if (!oldData) return [newMessage as Message];
      return [...oldData, newMessage as Message];
    });
  };

  const {
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    // cancelStream,
    clearError,
  } = useStreamingChat({
    conversationId: conv_id,
    spaceId: space_id,
    apiBaseURL,
    onMessageUpdate: updateMessageCache,
    onNewConversation: handleNewConversation,
  });

  const {
    data: messages,
    isLoading,
    isError,
  } = useGetConvMessages(conv_id as string, !isStreaming);

  useEffect(() => {
    if (error) {
      toast.addToast(error.message, "error", {
        variant: "accent",
        action: {
          label: "Try again",
          onClick: clearError,
        },
        description: error.message,
      });
    }
  }, [error, toast, clearError]);

  useEffect(() => {
    if (query) {
      sendMessage(query, selectedModel, selectedProvider, systemPrompt);
    }
  }, [query, sendMessage, selectedModel, selectedProvider, systemPrompt]);

  useEffect(() => {
    if (messages && containerRef.current) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop =
            containerRef.current.scrollHeight + 60;
        }
      });
    }
  }, [messages]);

  const getPlaceholderText = (): string => {
    if (isStreaming) {
      return streamingContent
        ? "Generating response..."
        : "Preparing response...";
    }
    return "Ask anything...";
  };

  return (
    <>
      <div
        className="flex-1 overflow-y-auto py-6 pb-8 custom-scrollbar"
        ref={containerRef}
      >
        <MessageList
          messages={messages}
          streamingMessage={streamingContent}
          error={error}
          clearError={clearError}
          isLoading={isLoading}
          isError={isError}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
        />
      </div>
      <div className="border-t border-border/70 p-6 relative z-10">
        <div className="max-w-full sm:max-w-[90vw] md:max-w-[75vw] lg:max-w-[55vw] mx-auto space-y-4 px-4">
          <MessageInput
            onSendMessage={(message) =>
              sendMessage(
                message,
                selectedModel,
                selectedProvider,
                systemPrompt,
              )
            }
            isPending={isStreaming}
            placeholder={getPlaceholderText()}
            // onCancel={isStreaming ? cancelStream : undefined}
          />
        </div>
      </div>
    </>
  );
};

export default Conversation;

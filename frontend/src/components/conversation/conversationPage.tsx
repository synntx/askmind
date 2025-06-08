import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useGetConvMessages } from "@/hooks/useMessage";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/toast";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Message } from "@/types/streaming";
import { useStreamingChat } from "@/hooks/useStreamingChat";

const Conversation: React.FC = () => {
  const { conv_id }: { conv_id: string } = useParams();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const queryClient = useQueryClient();
  const apiBaseURL = api.defaults.baseURL || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const toast = useToast();

  const {
    data: messages,
    isLoading,
    isError,
  } = useGetConvMessages(conv_id as string);

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
    apiBaseURL,
    onMessageUpdate: updateMessageCache,
  });

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

  // useEffect(() => {
  //   if (isPending && !streamingMessage) {
  //     setIsPreparing(true);
  //   } else if (streamingMessage) {
  //     setIsPreparing(false);
  //   }
  // }, [isPending, streamingMessage]);

  useEffect(() => {
    if (query) {
      sendMessage(query);
    }
  }, [query, sendMessage]);

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight + 60;
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
    <div className="h-screen flex flex-col bg-background text-white/90">
      <div
        className="flex-1 overflow-y-auto py-6 pb-28 custom-scrollbar"
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
            onSendMessage={sendMessage}
            isPending={isStreaming}
            placeholder={getPlaceholderText()}
            // onCancel={isStreaming ? cancelStream : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default Conversation;

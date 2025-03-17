import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useGetConvMessages } from "@/hooks/useMessage";
import { useQueryClient } from "@tanstack/react-query";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { useToast } from "../ui/toast";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Message } from "@/types/message";

const Conversation: React.FC = () => {
  const { conv_id }: { conv_id: string } = useParams();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const queryClient = useQueryClient();
  const apiBaseURL = api.defaults.baseURL || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
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
    streamingResponse: streamingMessage,
    isPending,
    error,
    getCompletion,
    clearError,
  } = useStreamingCompletion({
    conv_id,
    apiBaseURL,
    updateMessageCache,
  });

  useEffect(() => {
    if (error) {
      toast.addToast(error.message, "error", {
        variant: "accent",
        action: {
          label: "Try again",
          onClick: clearError,
        },
        description: error.details?.recovery_suggestions?.[0],
      });
    }
  }, [error, toast, clearError]);

  useEffect(() => {
    if (isPending && !streamingMessage) {
      setIsPreparing(true);
    } else if (streamingMessage) {
      setIsPreparing(false);
    }
  }, [isPending, streamingMessage]);

  useEffect(() => {
    if (query) {
      getCompletion(query);
    }
  }, [query, getCompletion]);

  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight + 60;
    }
  }, [messages]);

  const getPlaceholderText = (): string => {
    if (isPending) {
      return isPreparing ? "Preparing response..." : "Generating response...";
    }
    return "Ask anything...";
  };

  return (
    <div className="h-screen flex flex-col bg-background text-white/90">
      <div
        className="flex-1 overflow-y-auto p-6 pb-8 custom-scrollbar"
        ref={containerRef}
      >
        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          error={error}
          clearError={clearError}
          isLoading={isLoading}
          isError={isError}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
        />
      </div>

      <div className="border-t border-[#2c2d31]/50 p-6 relative z-10">
        <div className="max-w-full sm:max-w-[90vw] md:max-w-[75vw] lg:max-w-[55vw] mx-auto space-y-4 px-4">
          <MessageInput
            onSendMessage={getCompletion}
            isPending={isPending}
            placeholder={getPlaceholderText()}
          />
        </div>
      </div>
    </div>
  );
};

export default Conversation;

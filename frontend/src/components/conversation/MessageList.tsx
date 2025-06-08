import React from "react";
import { Message, StreamingMessage, ErrorMessage } from "./Message";
import { Sparkles } from "lucide-react";
import { LoadingIcon } from "@/icons";
import { Message as MessageType } from "@/types/streaming";

interface MessageListProps {
  messages: MessageType[] | undefined;
  streamingMessage: string | undefined;
  error: {
    message: string;
    details?: {
      recovery_suggestions?: string[];
    };
  } | null;
  clearError: () => void;
  isLoading: boolean;
  isError: boolean;
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingMessage,
  error,
  clearError,
  isLoading,
  isError,
  copiedId,
  setCopiedId,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingIcon className="animate-spin h-6 w-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-full text-red-400">
        Error loading messages. Please try again.
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-6 px-4 text-center">
        <Sparkles size={24} className="text-[#8A92E3] mb-2" />
        <h3 className="text-sm font-medium text-[#CACACA] mb-2">
          No messages yet
        </h3>
        <p className="text-[#CACACA]/50 text-xs">
          Start asking questions to get started
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-full sm:max-w-[90vw] md:max-w-[75vw] lg:max-w-[55vw] mx-auto space-y-4">
      {messages.map((message) => (
        <Message
          key={message.message_id}
          message={message}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
        />
      ))}

      {error && (
        <ErrorMessage
          content={error.message}
          details={error.details}
          onClearError={clearError}
        />
      )}

      {!error && streamingMessage && (
        <StreamingMessage
          content={streamingMessage}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
        />
      )}
    </div>
  );
};

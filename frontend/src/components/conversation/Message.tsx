import React from "react";
import { MarkdownContent } from "../common/MarkdownContent";
import { CopyButton } from "./CopyButton";
import { Message as MessageType } from "@/types/message";
import { AITypewriter } from "./AITypewriter";

interface MessageProps {
  message: MessageType;
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;
}

interface ErrorMessageProps {
  content: string;
  details?: {
    recovery_suggestions?: string[];
  };
  onClearError?: () => void;
}

interface StreamingMessageProps {
  content: string;
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;
}

export const Message: React.FC<MessageProps> = ({
  message,
  copiedId,
  setCopiedId,
}) => {
  if (message.role === "error") {
    return <ErrorMessage content={message.content} />;
  }

  return (
    <div
      className={`flex ${
        message.role === "user"
          ? "justify-end px-4"
          : message.role === "assistant"
            ? "justify-start px-4"
            : "justify-start py-2"
      } group`}
    >
      <div
        className={`rounded-2xl font-onest text-[16px] max-w-full relative ${
          message.role === "user"
            ? "bg-card text-foreground/80 px-4"
            : "text-foreground/80"
        }`}
      >
        <div
          className={`absolute ${message.role === "user" ? "bottom-1.5 -left-6" : "-bottom-5"} left-0 opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          <CopyButton
            text={message.content}
            id={message.message_id}
            copiedId={copiedId}
            setCopiedId={setCopiedId}
          />
        </div>
        {message.role === "user" ? (
          <div className="whitespace-pre-wrap py-2.5 overflow-y-hidden">
            {/* <MarkdownContent content={message.content} /> */}
            {message.content}
          </div>
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  content,
  details,
  onClearError,
}) => (
  <div className="flex justify-start group">
    <div className="rounded-2xl font-onest text-[16px] px-5 py-4 max-w-full bg-purple-900/10 text-purple-200 border border-purple-500/10 shadow-sm">
      <div className="flex items-start">
        <div className="mr-3 flex-shrink-0">
          <svg
            className="w-5 h-5 text-purple-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <div>
          <div className="font-medium">{content}</div>

          {details?.recovery_suggestions && (
            <div className="mt-3 text-sm text-purple-200/90">
              <div className="mb-1 font-medium text-purple-300">
                {"Here's what you can do:"}
              </div>
              <ul className="space-y-1.5">
                {details.recovery_suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2 text-purple-400">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onClearError && (
            <div className="mt-3 text-right">
              <button
                onClick={onClearError}
                className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-purple-400/10 hover:bg-purple-400/20 transition-colors text-purple-200"
              >
                <span>Got it</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  copiedId,
  setCopiedId,
}) => (
  <div className="flex justify-start group">
    <div className="rounded-2xl px-4 max-w-full text-foreground/80 relative">
      <div className="absolute top-3.5 -right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton
          text={content}
          id="streaming"
          copiedId={copiedId}
          setCopiedId={setCopiedId}
        />
      </div>
      <AITypewriter content={content} />
    </div>
  </div>
);

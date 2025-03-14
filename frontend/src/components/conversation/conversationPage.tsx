"use client";

import React, { useRef, useState, useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { LoadingIcon, CopyIcon, CheckmarkIcon } from "@/icons";
import { useGetConvMessages } from "@/hooks/useMessage";
import { Message } from "@/types/message";
import { useQueryClient } from "@tanstack/react-query";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";

interface CopyButtonProps {
  text: string;
  id: string;
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  id,
  copiedId,
  setCopiedId,
}) => {
  const copyToClipboard = (): void => {
    const tempElement = document.createElement("div");
    tempElement.innerHTML = text;
    const plainText = tempElement.textContent || tempElement.innerText || text;

    navigator.clipboard.writeText(plainText).then(
      () => {
        console.log("Text copied to clipboard");
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      },
    );
  };

  const isCopied = copiedId === id;

  return (
    <button
      className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-full"
      onClick={copyToClipboard}
      title={isCopied ? "Copied!" : "Copy message"}
      type="button"
    >
      {isCopied ? <CheckmarkIcon stroke="#4ade80" /> : <CopyIcon />}
    </button>
  );
};

const Conversation: React.FC = () => {
  const { conv_id } = useParams<{ conv_id: string }>();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const queryClient = useQueryClient();
  const apiBaseURL = api.defaults.baseURL || "";

  const { data: messages, isLoading, isError } = useGetConvMessages(conv_id);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputData, setInputData] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  } = useStreamingCompletion({
    conv_id,
    apiBaseURL,
    updateMessageCache,
  });

  console.log("streamingMessage", streamingMessage);

  useEffect(() => {
    // Only try to focus if we have messages (to prevent initial focus)
    if (messages && messages.length > 2 && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [messages]);

  useEffect(() => {
    if (query) {
      getCompletion(query);
    }
  }, [query, getCompletion]);

  const handleTextareaInput = (
    e: React.FormEvent<HTMLTextAreaElement>,
  ): void => {
    const textarea = e.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    setInputData(textarea.value);
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!inputData.trim() || isPending) return;

    const userMessage = inputData;
    setInputData("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await getCompletion(userMessage);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  return (
    <div className="h-screen flex flex-col bg-[#1a1b1e] text-white/90">
      <div
        className="flex-1 overflow-y-auto p-6 custom-scrollbar"
        ref={containerRef}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingIcon className="animate-spin h-6 w-6" />
          </div>
        ) : isError ? (
          <div className="flex justify-center items-center h-full text-red-400">
            Error loading messages. Please try again.
          </div>
        ) : !messages ? (
          <div className="w-full h-full flex flex-col items-center justify-center py-6 px-4 text-center">
            <Sparkles size={24} className="text-[#8A92E3] mb-2" />
            <h3 className="text-sm font-medium text-[#CACACA] mb-2">
              No messages yet
            </h3>
            <p className="text-[#CACACA]/50 text-xs">
              Start asking questions to get started
            </p>
          </div>
        ) : (
          <div className="max-w-[50vw] mx-auto space-y-4">
            {messages?.map((message) => (
              <div
                key={message.message_id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } group`}
              >
                <div
                  className={`rounded-2xl font-inter text-[16px] px-4 py-3 max-w-full relative ${
                    message.role === "user"
                      ? "bg-[#2c2d31]/10 text-white/90"
                      : "text-white/80 "
                  }`}
                >
                  <div className="absolute top-3.5 -right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton
                      text={message.content}
                      id={message.message_id}
                      copiedId={copiedId}
                      setCopiedId={setCopiedId}
                    />
                  </div>
                  <p className="leading-relaxed font-inter whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {streamingMessage && (
              <div className="flex justify-start group">
                <div className="rounded-2xl px-4 py-3 max-w-full text-white/80 relative">
                  <div className="absolute top-3.5 -right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton
                      text={streamingMessage}
                      id="streaming"
                      copiedId={copiedId}
                      setCopiedId={setCopiedId}
                    />
                  </div>
                  {/* <p className="leading-relaxed font-inter whitespace-pre-wrap"> */}
                  {/* {streamingMessage} */}
                  {/* <span className="ml-1 inline-block w-1 h-4 bg-white/50 animate-pulse"></span> */}
                  {/* </p> */}
                  <p
                    className="leading-relaxed font-inter whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: streamingMessage }}
                  />
                  {error && (
                    <p className="text-red-400 text-xs mt-2">{error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[#2c2d31]/50 p-6">
        <div className="max-w-[640px] mx-auto relative">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask anything..."
            value={inputData}
            onInput={handleTextareaInput}
            className="w-full bg-transparent text-white/90 placeholder-white/30 p-0 pr-12 focus:outline-none resize-none text-xl font-light custom-scrollbar"
            style={{ maxHeight: "300px", overflow: "auto" }}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isPending}
          />
          {inputData && (
            <button
              onClick={handleSendMessage}
              disabled={isPending}
              aria-label={isPending ? "Sending message..." : "Send message"}
              className="absolute right-4 bottom-1 opacity-40 hover:opacity-80 transition-opacity duration-200 disabled:opacity-20"
              type="button"
            >
              {isPending ? (
                <LoadingIcon className="animate-spin h-4 w-4" />
              ) : (
                <ArrowRight size={16} strokeWidth={1.5} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conversation;

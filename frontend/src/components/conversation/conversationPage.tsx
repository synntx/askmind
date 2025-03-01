"use client";

import React, { useRef, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { LoadingIcon } from "@/icons";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const Conversation = () => {
  const { conv_id, space_id } = useParams();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputData, setInputData] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
    {
      id: "2",
      content: query || "My initial question",
      isUser: true,
      timestamp: new Date(),
    },
  ]);
  const [isPending, setIsPending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");

  const getCompletion = async (userMessage: string) => {
  setIsPending(true);
  try {
    let accumulatedMessage = "";

    const token = localStorage.getItem('token'); 
    
    const response = await fetch(`${api.defaults.baseURL}/c/completion?user_message=${encodeURIComponent(
      userMessage
    )}&model=idk&conv_id=${conv_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`, 
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }
    
    const decoder = new TextDecoder();
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5);
          if (data.trim() === '[DONE]') {
            continue;
          }
          
          accumulatedMessage += data;
          setStreamingMessage(accumulatedMessage);
        }
      }
    }
    
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: accumulatedMessage,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setStreamingMessage("");
    
  } catch (error) {
    console.error("Error getting completion:", error);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: "Error getting response. Please try again.",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  } finally {
    setIsPending(false);
  }
};

  useEffect(() => {
    if (query) {
      getCompletion(query);
    }
  }, [query]);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    setInputData(textarea.value);
  };

  const handleSendMessage = () => {
    if (!inputData.trim() || isPending) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputData,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputData("");
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    getCompletion(inputData);
  };

  return (
    <div className="h-screen flex flex-col bg-[#1a1b1e] text-white/90">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-[640px] mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={` rounded-2xl px-4 py-3 ${
                  message.isUser
                    ? "bg-[#2c2d31]/20 text-white/90"
                    : "text-white/80"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <span className="text-xs text-white/30 mt-1 block">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {streamingMessage && (
            <div className="flex justify-start">
              <div className="w-full rounded-2xl px-4 py-3 bg-[#242528] text-white/80 animate-pulse">
                <p className="text-sm leading-relaxed">{streamingMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#2c2d31] p-6">
        <div className="max-w-[640px] mx-auto relative">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask anything..."
            value={inputData}
            onInput={handleTextareaInput}
            className="w-full bg-transparent text-white/90 placeholder-white/30 p-0 pr-12 focus:outline-none resize-none text-xl font-light custom-scrollbar"
            style={{ maxHeight: "300px", overflow: "auto" }}
            onKeyDown={(e) => {
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
              aria-label={
                isPending ? "Sending message..." : "Send message"
              }
              className="absolute right-4 bottom-1 opacity-40 hover:opacity-80 transition-opacity duration-200 disabled:opacity-20"
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

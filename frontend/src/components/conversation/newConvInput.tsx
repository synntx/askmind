"use client";

import React, { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useCreateConversation } from "@/hooks/useConversation";
import { useParams, useRouter } from "next/navigation";
import { CreateConversation } from "@/lib/validations";
import { LoadingIcon } from "@/icons";

const NewConvInput: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputData, setInputData] = useState("");
  const { space_id } = useParams();
  const router = useRouter();

  const {
    mutate,
    data: convData,
    isPending,
    isSuccess,
  } = useCreateConversation();

  if (isSuccess && convData) {
    router.push(`/space/${convData.space_id}/c/${convData.conversation_id}`);
  }

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    setInputData(textarea.value);
  };

  const handleSendMessage = () => {
    if (!inputData.trim() || isPending) return;

    const data: CreateConversation = {
      space_id: space_id as string,
      title: inputData,
    };
    mutate(data);
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-[640px] relative">
        <textarea
          autoFocus
          ref={textareaRef}
          rows={1}
          placeholder="Ask anything..."
          onInput={handleTextareaInput}
          className="w-full bg-transparent text-white/90 placeholder-white/30 p-0 pr-6 focus:outline-none resize-none text-xl font-light custom-scrollbar"
          style={{ maxHeight: "300px", overflow: "auto" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        {inputData && (
          <button
            onClick={handleSendMessage}
            disabled={isPending}
            aria-label={isPending ? "Creating conversation..." : "Send message"}
            className="absolute right-4 bottom-1 opacity-40 hover:opacity-80 transition-opacity duration-200"
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
  );
};

export default NewConvInput;

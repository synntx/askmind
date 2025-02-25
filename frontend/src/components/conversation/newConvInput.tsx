"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  SendHorizontal,
  Search,
  Sparkles,
  Command,
  Wand2,
  ArrowRight,
} from "lucide-react";
import { useCreateConversation } from "@/hooks/useConversation";
import { useParams, useRouter } from "next/navigation";
import { CreateConversation } from "@/lib/validations";
import { title } from "process";

interface Suggestion {
  text: string;
  icon: React.ReactNode;
  prompt: string;
  description: string;
}

const suggestions: Suggestion[] = [
  {
    text: "Focus mode",
    icon: <Search size={14} />,
    prompt: "Help me create a focused work environment",
    description: "Get personalized focus tips",
  },
  {
    text: "Ask anything",
    icon: <Command size={14} />,
    prompt: "I'm curious about",
    description: "Ask any question",
  },
  {
    text: "Discover",
    icon: <Sparkles size={14} />,
    prompt: "Show me something interesting about",
    description: "Explore random topics",
  },
  {
    text: "Creative",
    icon: <Wand2 size={14} />,
    prompt: "Help me generate creative ideas for",
    description: "Boost creativity",
  },
];

const NewConvInput: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [inputData, setInputData] = useState("");
  const { space_id }: { space_id: string } = useParams();
  const router = useRouter()

  const { mutate,data:convData, isPending, isSuccess } = useCreateConversation();

  if (isSuccess){
      router.push(
        `/space/${convData.space_id}/c/${convData.conversation_id}?q=${title}`,
      );
  }



  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (textareaRef.current) {
      textareaRef.current.value = suggestion.prompt;
      textareaRef.current.focus();
      // ONLY NEEDED IF WE HAVE LONGER PROMPT
      // const event = new Event("input", { bubbles: true });
      // textareaRef.current.dispatchEvent(event);
    }
  };

  const handleSendMessage = () => {
    const data: CreateConversation = {
      space_id: space_id,
      title: inputData,
    };
    mutate(data);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
      <div className="w-full max-w-2xl relative group">
        <div className="absolute inset-0 rounded-xl transition-all duration-200 border border-[#282828] bg-[#262626]" />
        <div className="relative flex items-center rounded-xl border">
          <div className="absolute left-3 text-gray-500">
            <Command size={16} />
          </div>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask anything... "
            onInput={handleTextareaInput}
            onChange={(e) => setInputData(e.target.value)}
            className="w-full bg-transparent text-sm placeholder:pt-0.5 text-gray-200 placeholder-gray-500 pl-10 pr-12 py-4 focus:outline-none resize-none overflow-hidden min-h-[56px]"
            style={{
              maxHeight: "200px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button className="absolute right-3 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-150">
            <SendHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-1">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="relative group">
            <button
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-all duration-150"
            >
              {suggestion.icon}
              {suggestion.text}
            </button>

            {activeIndex === index && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[200px] p-3 bg-[#1a1a1a] border border-[#282828] rounded-lg shadow-xl text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-white/5 rounded-md text-gray-200">
                    {suggestion.icon}
                  </div>
                  <span className="font-medium text-gray-200">
                    {suggestion.text}
                  </span>
                </div>
                <p className="text-gray-400 mb-2">{suggestion.description}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span>Click to use</span>
                  <ArrowRight size={10} />
                  <span className="text-gray-400">"{suggestion.prompt}"</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewConvInput;


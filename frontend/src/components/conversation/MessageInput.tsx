import React, { useRef, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { LoadingIcon } from "@/icons";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isPending: boolean;
  placeholder: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isPending,
  placeholder,
}) => {
  const [inputData, setInputData] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaInput = (
    e: React.FormEvent<HTMLTextAreaElement>,
  ): void => {
    const textarea = e.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    setInputData(textarea.value);
  };

  const handleSend = async (): Promise<void> => {
    if (!inputData.trim() || isPending) return;

    const message = inputData;
    setInputData("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await onSendMessage(message);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder={placeholder}
        value={inputData}
        onInput={handleTextareaInput}
        className="w-full bg-background text-foreground/90 placeholder-foreground/30 p-0 pr-12 focus:outline-none resize-none text-xl font-light custom-scrollbar"
        style={{ maxHeight: "300px", overflow: "auto" }}
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={isPending}
      />
      {inputData && (
        <button
          onClick={handleSend}
          disabled={isPending}
          aria-label={isPending ? "Sending message..." : "Send message"}
          className="absolute right-4 bottom-1 text-muted-foreground hover:text-foreground transition-colors duration-200 disabled:text-muted-foreground/50"
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
  );
};

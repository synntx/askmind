"use client";

import React from "react";
import { ModelSelector } from "./ModelSelector";
import { Dropdown } from "../ui/dropdown";
import { useListPrompts } from "@/hooks/useMessage";
import { useConversationContext } from "@/contexts/ConversationContext";

interface ConversationLayoutProps {
  children: React.ReactNode;
}

export const ConversationLayout: React.FC<ConversationLayoutProps> = ({
  children,
}) => {
  const { data: prompts } = useListPrompts();
  const {
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    systemPrompt,
    setSystemPrompt,
  } = useConversationContext();

  const handleModelSelect = (modelId: string, providerId: string) => {
    setSelectedModel(modelId);
    setSelectedProvider(providerId);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="px-6 py-2.5 pb-4 flex justify-start items-center gap-2">
        <ModelSelector
          selectedModel={selectedModel}
          selectedProvider={selectedProvider}
          onModelSelect={handleModelSelect}
          isStreaming={false} 
        />
        {prompts && (
          <Dropdown
            options={prompts.map((p) => ({
              label: p.charAt(0).toUpperCase() + p.slice(1),
              value: p,
            }))}
            value={systemPrompt}
            onSelect={(value) => setSystemPrompt(value as string)}
            placeholder="Select a system prompt"
            className="w-48"
            disabled={false}
            searchable
            quickSearchKey=""
          />
        )}
      </div>
      {children}
    </div>
  );
};

"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConversationContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.0-flash");
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  const [systemPrompt, setSystemPrompt] = useState<string>("general");

  return (
    <ConversationContext.Provider value={{ selectedModel, setSelectedModel, selectedProvider, setSelectedProvider, systemPrompt, setSystemPrompt }}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
};

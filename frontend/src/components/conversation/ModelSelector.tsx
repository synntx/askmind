"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Sparkles, Zap, Server } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  size?: string;
  speed?: "fast" | "balanced" | "powerful";
}

const models: Model[] = [
  // Gemini models
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    speed: "fast",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    speed: "fast",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    speed: "powerful",
  },
  {
    id: "gemini-2.5-flash-preview-04-17",
    name: "Gemini 2.5 Flash Preview",
    provider: "gemini",
    speed: "fast",
  },
  {
    id: "gemini-2.5-flash-lite-preview-06-17",
    name: "Gemini 2.5 Flash Lite",
    provider: "gemini",
    speed: "fast",
  },

  // Groq models
  {
    id: "gemma2-9b-it",
    name: "Gemma2 9B",
    provider: "groq",
    size: "9B",
    speed: "balanced",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "groq",
    size: "8B",
    speed: "fast",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    size: "70B",
    speed: "powerful",
  },
  {
    id: "mistral-saba-24b",
    name: "Mistral Saba 24B",
    provider: "groq",
    size: "24B",
    speed: "balanced",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 70B",
    provider: "groq",
    size: "70B",
    speed: "powerful",
  },
  {
    id: "qwen-qwq-32b",
    name: "Qwen QWQ 32B",
    provider: "groq",
    size: "32B",
    speed: "powerful",
  },

  // Ollama models
  { id: "llama3.2", name: "Llama 3.2", provider: "ollama", speed: "balanced" },
  {
    id: "qwen2.5:7b",
    name: "Qwen 2.5 7B",
    provider: "ollama",
    size: "7B",
    speed: "balanced",
  },
  {
    id: "qwen2.5:3b",
    name: "Qwen 2.5 3B",
    provider: "ollama",
    size: "3B",
    speed: "fast",
  },
  {
    id: "qwen2.5:1.5b",
    name: "Qwen 2.5 1.5B",
    provider: "ollama",
    size: "1.5B",
    speed: "fast",
  },
  {
    id: "qwen3:0.6b",
    name: "Qwen 3 0.6B",
    provider: "ollama",
    size: "0.6B",
    speed: "fast",
  },
  {
    id: "phi4-mini:latest",
    name: "Phi 4 Mini",
    provider: "ollama",
    size: "2.5B",
    speed: "fast",
  },
];

const providerIcons = {
  gemini: Sparkles,
  groq: Zap,
  ollama: Server,
};

const speedColors = {
  fast: "text-green-500",
  balanced: "text-blue-500",
  powerful: "text-purple-500",
};

interface ModelSelectorProps {
  selectedModel: string;
  selectedProvider: string;
  onModelSelect: (modelId: string, providerId: string) => void;
  isStreaming: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  selectedProvider,
  onModelSelect,
  isStreaming,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
      // Quick search with "/" key
      if (e.key === "/" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const currentModel =
    models.find(
      (m) => m.id === selectedModel && m.provider === selectedProvider,
    ) ||
    models.find((m) => m.id === selectedModel) ||
    models[0];
  const CurrentIcon =
    providerIcons[currentModel.provider as keyof typeof providerIcons] ||
    Sparkles;

  // Filter models based on search
  const filteredModels = models.filter(
    (model) =>
      model.name.toLowerCase().includes(search.toLowerCase()) ||
      model.provider.toLowerCase().includes(search.toLowerCase()),
  );

  // Group filtered models by provider
  const groupedModels = filteredModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, Model[]>,
  );

  // Recently used models [should be stored in the localStorage/state]
  const recentModels = [currentModel].filter(Boolean);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isStreaming}
        className="group flex items-center gap-2 px-3 py-1.5 text-sm text-foreground/90 hover:text-foreground hover:bg-accent/30 rounded-md transition-all disabled:opacity-50"
        title="Press / to search models"
      >
        <CurrentIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        <span>{currentModel.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-popover/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Recent section */}
            {!search && recentModels.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 text-xs text-muted-foreground">
                  Recent
                </div>
                {recentModels.map((model) => {
                  if (!model) return null;
                  const Icon =
                    providerIcons[
                      model.provider as keyof typeof providerIcons
                    ] || Sparkles;
                  return (
                    <button
                      key={`${model.provider}-${model.id}`}
                      onClick={() => {
                        onModelSelect(model.id, model.provider);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/20 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 opacity-60" />
                      <span className="flex-1 text-left">{model.name}</span>
                      {model.size && (
                        <span className="text-xs text-muted-foreground">
                          {model.size}
                        </span>
                      )}
                    </button>
                  );
                })}
                <div className="h-px bg-border/30 mx-2 my-1" />
              </>
            )}

            {/* Grouped models */}
            {Object.entries(groupedModels).map(
              ([provider, providerModels], index) => {
                const Icon =
                  providerIcons[provider as keyof typeof providerIcons];
                return (
                  <div key={provider}>
                    {(index > 0 || (!search && recentModels.length > 0)) && (
                      <div className="h-px bg-border/30 mx-2 my-1" />
                    )}
                    <div className="px-3 py-1 text-xs text-muted-foreground uppercase flex items-center gap-1.5">
                      <Icon className="w-3 h-3" />
                      {provider}
                    </div>
                    {providerModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelSelect(model.id, model.provider);
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          model.id === selectedModel &&
                          model.provider === selectedProvider
                            ? "bg-accent/40 text-foreground"
                            : "text-foreground/80 hover:bg-accent/20 hover:text-foreground"
                        }`}
                      >
                        <span className="flex-1 text-left">{model.name}</span>
                        <div className="flex items-center gap-2">
                          {model.size && (
                            <span className="text-xs text-muted-foreground">
                              {model.size}
                            </span>
                          )}
                          {model.speed && (
                            <span
                              className={`text-xs ${speedColors[model.speed]}`}
                            >
                              {model.speed === "fast"
                                ? "⚡"
                                : model.speed === "balanced"
                                  ? "⚖️"
                                  : "💪"}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              },
            )}

            {filteredModels.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No models found
              </div>
            )}
          </div>

          {/* Footer tip */}
          <div className="px-3 py-2 border-t border-border/30 text-xs text-muted-foreground">
            Tip: Press{" "}
            <kbd className="px-1 py-0.5 bg-background/50 rounded text-xs">
              Esc
            </kbd>{" "}
            to close
          </div>
        </div>
      )}
    </div>
  );
};

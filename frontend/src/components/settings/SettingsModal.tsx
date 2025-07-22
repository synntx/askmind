"use client";

import React, { useEffect, useState } from "react";
import { X, Check, Palette, User, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import UserSettings from "./UserSettings";

interface ThemeOption {
  name: string;
  class: string;
  preview: {
    bg: string;
    fg: string;
    primary: string;
    accent?: string;
  };
  description?: string;
}

const availableThemes: ThemeOption[] = [
  {
    name: "Default Light",
    class: "",
    description: "Clean and minimal",
    preview: {
      bg: "hsl(0 0% 100%)",
      fg: "hsl(240 10% 3.9%)",
      primary: "hsl(234 62% 71%)",
      accent: "hsl(234 62% 85%)",
    },
  },
  {
    name: "Default Dark",
    class: "dark",
    description: "Easy on the eyes",
    preview: {
      bg: "hsl(234 10% 11%)",
      fg: "hsl(0 0% 95%)",
      primary: "hsl(234 62% 71%)",
      accent: "hsl(234 62% 25%)",
    },
  },
  {
    name: "Sunset",
    class: "theme-a",
    description: "Warm and inviting",
    preview: {
      bg: "hsl(48 100% 98%)",
      fg: "hsl(48 60% 10%)",
      primary: "hsl(34 100% 50%)",
      accent: "hsl(34 100% 85%)",
    },
  },
  {
    name: "Midnight Sunset",
    class: "theme-a-dark",
    description: "Cozy evening vibes",
    preview: {
      bg: "hsl(48 20% 12%)",
      fg: "hsl(48 20% 90%)",
      primary: "hsl(34 100% 60%)",
      accent: "hsl(34 100% 25%)",
    },
  },
  {
    name: "Ocean Breeze",
    class: "theme-b",
    description: "Fresh and calming",
    preview: {
      bg: "hsl(210 60% 98%)",
      fg: "hsl(210 40% 15%)",
      primary: "hsl(200 100% 50%)",
      accent: "hsl(200 100% 85%)",
    },
  },
  {
    name: "Deep Ocean",
    class: "theme-b-dark",
    description: "Mysterious depths",
    preview: {
      bg: "hsl(210 20% 12%)",
      fg: "hsl(210 20% 90%)",
      primary: "hsl(200 100% 60%)",
      accent: "hsl(210 100% 25%)",
    },
  },
  {
    name: "Forest",
    class: "theme-c",
    description: "Natural and grounded",
    preview: {
      bg: "hsl(220 20% 98%)",
      fg: "hsl(220 10% 10%)",
      primary: "hsl(145 60% 38%)",
      accent: "hsl(145 60% 85%)",
    },
  },
  {
    name: "Midnight Forest",
    class: "theme-c-dark",
    description: "Serene woodland",
    preview: {
      bg: "hsl(220 10% 10%)",
      fg: "hsl(0 0% 95%)",
      primary: "hsl(145 65% 50%)",
      accent: "hsl(145 65% 25%)",
    },
  },
  {
    name: "Arctic",
    class: "theme-d",
    description: "Cool and crisp",
    preview: {
      bg: "hsl(225 60% 98%)",
      fg: "hsl(225 30% 15%)",
      primary: "hsl(195 80% 45%)",
      accent: "hsl(195 80% 85%)",
    },
  },
  {
    name: "Arctic Night",
    class: "theme-d-dark",
    description: "Aurora inspired",
    preview: {
      bg: "hsl(225 20% 12%)",
      fg: "hsl(0 0% 95%)",
      primary: "hsl(195 90% 55%)",
      accent: "hsl(195 90% 25%)",
    },
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (themeClass: string) => void;
}

type SettingsTab = "profile" | "themes";

const tabConfig = {
  profile: {
    icon: User,
    label: "Profile",
    description: "Personal information",
  },
  themes: {
    icon: Palette,
    label: "Themes",
    description: "Customize appearance",
  },
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("themes");

  // Handles Escape key press and body scroll lock
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handler for clicking on the backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handler for keyboard events on the outermost modal div
  const handleKeyboardEscape = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          className="fixed inset-0 bg-gradient-to-br from-background/60 via-background/50 to-background/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.05 }}
          onClick={handleBackdropClick}
          onKeyDown={handleKeyboardEscape}
          tabIndex={-1}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.04, ease: "easeOut" }}
            className="relative z-10 w-full max-w-5xl h-[85vh] rounded-2xl bg-gradient-to-br from-card/95 to-card shadow-md border border-border/50 overflow-hidden flex backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-64 border-r border-border/30 shrink-0 bg-gradient-to-b from-muted/30 to-muted/10">
              <div className="p-6 border-b border-border/30">
                <div className="flex items-center space-x-2">
                  <div>
                    <h2
                      id="settings-modal-title"
                      className="text-lg font-semibold text-foreground"
                    >
                      Settings
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Customize your experience
                    </p>
                  </div>
                </div>
              </div>

              <nav className="p-3">
                <ul className="space-y-2">
                  {Object.entries(tabConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const isActive = activeTab === key;

                    return (
                      <li key={key}>
                        <button
                          onClick={() => setActiveTab(key as SettingsTab)}
                          className={`group w-full flex items-center justify-between p-3 border border-transparent rounded-xl text-sm ${
                            isActive
                              ? "bg-primary/5 text-primary border border-primary/20"
                              : "text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon
                              size={18}
                              className={
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }
                            />
                            <div className="text-left">
                              <div className="font-medium">{config.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {config.description}
                              </div>
                            </div>
                          </div>
                          <ChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${
                              isActive
                                ? "text-primary rotate-90"
                                : "text-muted-foreground group-hover:translate-x-0.5"
                            }`}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border/30">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    {tabConfig[activeTab].label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {tabConfig[activeTab].description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="group rounded-xl p-2.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 hover:rotate-90"
                  aria-label="Close settings"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {activeTab === "themes" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {availableThemes.map((theme, index) => (
                        <button
                          key={theme.class}
                          onClick={() => onThemeChange(theme.class)}
                          className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-300 text-left active:scale-[0.98] ${
                            currentTheme === theme.class
                              ? "border-primary/50  bg-gradient-to-br from-primary/10 to-primary/5 ring-2 ring-primary/20"
                              : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                          }`}
                          style={{
                            animationDelay: `${index * 50}ms`,
                          }}
                          aria-pressed={currentTheme === theme.class}
                        >
                          <div
                            className="w-full h-20 rounded-xl mb-4 overflow-hidden shadow-inner border border-border/20"
                            style={{ backgroundColor: theme.preview.bg }}
                          >
                            <div className="flex h-full p-2">
                              <div
                                className="w-1/3 h-full rounded-lg shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${theme.preview.primary}, ${theme.preview.accent || theme.preview.primary})`,
                                }}
                              />
                              <div className="flex-1 pl-2 space-y-1.5">
                                <div
                                  className="w-full h-2 rounded-full"
                                  style={{
                                    backgroundColor: theme.preview.fg,
                                    opacity: 0.8,
                                  }}
                                />
                                <div
                                  className="w-4/5 h-2 rounded-full"
                                  style={{
                                    backgroundColor: theme.preview.fg,
                                    opacity: 0.6,
                                  }}
                                />
                                <div
                                  className="w-3/5 h-2 rounded-full"
                                  style={{
                                    backgroundColor: theme.preview.fg,
                                    opacity: 0.4,
                                  }}
                                />
                                <div
                                  className="w-1/2 h-1.5 rounded-full mt-2"
                                  style={{
                                    backgroundColor: theme.preview.primary,
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-semibold text-foreground transition-colors">
                              {theme.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {theme.description}
                            </p>
                          </div>
                          {currentTheme === theme.class && (
                            <div className="absolute top-3 right-3 p-1.5 bg-primary rounded-full text-primary-foreground shadow-lg">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      {activeTab === "profile" && (
                        <>
                          <UserSettings />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

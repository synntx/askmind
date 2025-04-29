"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Check,
  Palette,
  Bell,
  Lock,
  HelpCircle,
  Shield,
  User,
} from "lucide-react";

interface ThemeOption {
  name: string;
  class: string;
  preview: {
    bg: string;
    fg: string;
    primary: string;
  };
}

const availableThemes: ThemeOption[] = [
  {
    name: "Default Light",
    class: "",
    preview: {
      bg: "hsl(0 0% 100%)",
      fg: "hsl(240 10% 3.9%)",
      primary: "hsl(234 62% 71%)",
    },
  },
  {
    name: "Default Dark",
    class: "dark",
    preview: {
      bg: "hsl(234 10% 11%)",
      fg: "hsl(0 0% 95%)",
      primary: "hsl(234 62% 71%)",
    },
  },
  {
    name: "Theme A",
    class: "theme-a",
    preview: {
      bg: "hsl(48 100% 98%)",
      fg: "hsl(48 60% 10%)",
      primary: "hsl(34 100% 50%)",
    },
  },
  {
    name: "Theme A Dark",
    class: "theme-a-dark",
    preview: {
      bg: "hsl(48 20% 12%)",
      fg: "hsl(48 20% 90%)",
      primary: "hsl(34 100% 60%)",
    },
  },
  {
    name: "Theme B",
    class: "theme-b",
    preview: {
      bg: "hsl(210 60% 98%)",
      fg: "hsl(210 40% 15%)",
      primary: "hsl(200 100% 50%)",
    },
  },
  {
    name: "Theme B Dark",
    class: "theme-b-dark",
    preview: {
      bg: "hsl(210 20% 12%)",
      fg: "hsl(210 20% 90%)",
      primary: "hsl(200 100% 60%)",
    },
  },
  {
    name: "Theme C",
    class: "theme-c",
    preview: {
      bg: "hsl(220 20% 98%)",
      fg: "hsl(220 10% 10%)",
      primary: "hsl(145 60% 38%)",
    },
  },
  {
    name: "Theme C Dark",
    class: "theme-c-dark",
    preview: {
      bg: "hsl(220 10% 10%)",
      fg: "hsl(0 0% 95%)",
      primary: "hsl(145 65% 50%)",
    },
  },
  {
    name: "Theme D",
    class: "theme-d",
    preview: {
      bg: "hsl(225 60% 98%)",
      fg: "hsl(225 30% 15%)",
      primary: "hsl(195 80% 45%)",
    },
  },
  {
    name: "Theme D Dark",
    class: "theme-d-dark",
    preview: {
      bg: "hsl(225 20% 12%)",
      fg: "hsl(0 0% 95%)",
      primary: "hsl(195 90% 55%)",
    },
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (themeClass: string) => void;
}

type SettingsTab =
  | "profile"
  | "account"
  | "themes"
  | "notifications"
  | "privacy"
  | "help";

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("themes");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-4xl h-[80vh] rounded-xl bg-card shadow-lg border border-border overflow-hidden flex">
        {/* 1. Sidebar in settings */}
        <div className="w-56 border-r border-border/50 shrink-0">
          <div className="p-4 border-b border-border/50">
            <h2
              id="settings-modal-title"
              className="text-base font-medium text-foreground"
            >
              Settings
            </h2>
          </div>
          <nav className="p-2">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                    activeTab === "profile"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("account")}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                    activeTab === "account"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Shield size={16} />
                  <span>Account</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("themes")}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                    activeTab === "themes"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Palette size={16} />
                  <span>Themes</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("notifications")}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                    activeTab === "notifications"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Bell size={16} />
                  <span>Notifications</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("privacy")}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                    activeTab === "privacy"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Lock size={16} />
                  <span>Privacy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("help")}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
                    activeTab === "help"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <HelpCircle size={16} />
                  <span>Help</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* 2. Content in settings */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="text-base font-medium text-foreground">
              {activeTab === "profile" && "Profile Settings"}
              {activeTab === "account" && "Account Settings"}
              {activeTab === "themes" && "Choose Theme"}
              {activeTab === "notifications" && "Notification Preferences"}
              {activeTab === "privacy" && "Privacy Settings"}
              {activeTab === "help" && "Help & Support"}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close settings"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-5">
            {activeTab === "themes" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableThemes.map((theme) => (
                  <button
                    key={theme.class}
                    onClick={() => onThemeChange(theme.class)}
                    className={`
                      relative flex flex-col items-center p-3 rounded-lg border transition-all text-center
                      ${
                        currentTheme === theme.class
                          ? "border-primary/70 shadow-sm bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-muted/40"
                      }
                    `}
                    aria-pressed={currentTheme === theme.class}
                  >
                    {/* Theme preview block */}
                    <div
                      className="w-full h-16 rounded-md mb-3 overflow-hidden"
                      style={{ backgroundColor: theme.preview.bg }}
                    >
                      <div className="flex h-full p-1.5">
                        {/* Sidebar accent */}
                        <div
                          className="w-1/3 h-full rounded-sm"
                          style={{ backgroundColor: theme.preview.primary }}
                        />
                        {/* Content stripes */}
                        <div className="flex-1 pl-1.5">
                          <div
                            className="w-full h-2 rounded-sm mb-1"
                            style={{
                              backgroundColor: theme.preview.fg,
                              opacity: 0.7,
                            }}
                          />
                          <div
                            className="w-3/4 h-2 rounded-sm mb-1"
                            style={{
                              backgroundColor: theme.preview.fg,
                              opacity: 0.5,
                            }}
                          />
                          <div
                            className="w-2/3 h-2 rounded-sm"
                            style={{
                              backgroundColor: theme.preview.fg,
                              opacity: 0.3,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-medium text-foreground leading-tight">
                      {theme.name}
                    </span>

                    {currentTheme === theme.class && (
                      <div className="absolute top-2 right-2 p-0.5 bg-primary rounded-full text-primary-foreground">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : activeTab === "profile" ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Profile settings content will appear here.
                </p>
              </div>
            ) : activeTab === "account" ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Account settings content will appear here.
                </p>
              </div>
            ) : activeTab === "notifications" ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Notification settings content will appear here.
                </p>
              </div>
            ) : activeTab === "privacy" ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Privacy settings content will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Help & support content will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

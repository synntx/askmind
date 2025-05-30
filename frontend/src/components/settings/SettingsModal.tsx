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
  ChevronRight,
  Sparkles,
} from "lucide-react";

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
      accent: "hsl(200 100% 25%)",
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

type SettingsTab =
  | "profile"
  | "account"
  | "themes"
  | "notifications"
  | "privacy"
  | "help";

const tabConfig = {
  profile: {
    icon: User,
    label: "Profile",
    description: "Personal information",
  },
  account: { icon: Shield, label: "Account", description: "Security settings" },
  themes: {
    icon: Palette,
    label: "Themes",
    description: "Customize appearance",
  },
  notifications: {
    icon: Bell,
    label: "Notifications",
    description: "Alert preferences",
  },
  privacy: { icon: Lock, label: "Privacy", description: "Data & permissions" },
  help: { icon: HelpCircle, label: "Help", description: "Support & resources" },
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("themes");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className={`fixed inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-md transition-all duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 w-full max-w-5xl h-[85vh] rounded-2xl bg-gradient-to-br from-card/95 to-card shadow-2xl border border-border/50 overflow-hidden flex backdrop-blur-xl transition-all duration-300 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
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
                      className={`group w-full flex items-center justify-between p-3 border border-transparent rounded-xl text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20"
                          : "text-foreground hover:bg-muted/50 hover:translate-x-1 active:scale-[0.96]"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon
                          size={18}
                          className={
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
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
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/30 bg-gradient-to-r from-background/50 to-muted/20">
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
                {/* <div className="text-center mb-8">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Choose Your Perfect Theme
                  </h3>
                  <p className="text-muted-foreground">
                    Select a theme that matches your style and mood
                  </p>
                </div> */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableThemes.map((theme, index) => (
                    <button
                      key={theme.class}
                      onClick={() => onThemeChange(theme.class)}
                      className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98] ${
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
                        <div className="absolute top-3 right-3 p-1.5 bg-primary rounded-full text-primary-foreground shadow-lg animate-pulse">
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
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                    {React.createElement(tabConfig[activeTab].icon, {
                      size: 24,
                      className: "text-primary",
                    })}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {tabConfig[activeTab].label} Settings
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {activeTab === "profile" &&
                      "Manage your personal information and preferences"}
                    {activeTab === "account" &&
                      "Configure security settings and account details"}
                    {activeTab === "notifications" &&
                      "Control how and when you receive notifications"}
                    {activeTab === "privacy" &&
                      "Manage your data privacy and sharing preferences"}
                    {activeTab === "help" &&
                      "Find answers and get support for your questions"}
                  </p>
                </div>

                <div className="grid gap-4">
                  {activeTab === "profile" && (
                    <>
                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Personal Information
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Update your name, email, and profile picture
                        </p>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <User size={20} className="text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              John Doe
                            </div>
                            <div className="text-sm text-muted-foreground">
                              john.doe@example.com
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Preferences
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Customize your experience and interface settings
                        </p>
                      </div>
                    </>
                  )}

                  {activeTab === "account" && (
                    <>
                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Security
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Manage passwords and two-factor authentication
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground">
                            Two-factor authentication
                          </span>
                          <div className="w-10 h-6 bg-primary rounded-full flex items-center justify-end px-1">
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Connected Accounts
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Manage linked social media and service accounts
                        </p>
                      </div>
                    </>
                  )}

                  {activeTab === "notifications" && (
                    <>
                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Push Notifications
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Control mobile and desktop notifications
                        </p>
                        <div className="space-y-3">
                          {["Messages", "Updates", "Reminders"].map((item) => (
                            <div
                              key={item}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-foreground">
                                {item}
                              </span>
                              <div className="w-10 h-6 bg-muted rounded-full flex items-center px-1">
                                <div className="w-4 h-4 bg-primary rounded-full shadow-sm"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Email Preferences
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Choose what emails you'd like to receive
                        </p>
                      </div>
                    </>
                  )}

                  {activeTab === "privacy" && (
                    <>
                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Data Collection
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Control what data we collect and how it's used
                        </p>
                        <div className="space-y-3">
                          {["Analytics", "Personalization", "Marketing"].map(
                            (item) => (
                              <div
                                key={item}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm text-foreground">
                                  {item}
                                </span>
                                <div className="w-10 h-6 bg-muted rounded-full flex items-center px-1">
                                  <div className="w-4 h-4 bg-muted-foreground rounded-full shadow-sm"></div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Visibility
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Control who can see your profile and activity
                        </p>
                      </div>
                    </>
                  )}

                  {activeTab === "help" && (
                    <>
                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Documentation
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Browse our comprehensive guides and tutorials
                        </p>
                        <button className="text-sm text-primary hover:text-primary/80 font-medium">
                          View Documentation →
                        </button>
                      </div>

                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Contact Support
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get help from our support team
                        </p>
                        <button className="text-sm text-primary hover:text-primary/80 font-medium">
                          Contact Us →
                        </button>
                      </div>

                      <div className="p-6 rounded-xl border border-border/50 bg-gradient-to-r from-card to-muted/20 hover:shadow-md transition-all duration-200">
                        <h4 className="font-medium text-foreground mb-2">
                          Community
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Join our community forum for tips and discussions
                        </p>
                        <button className="text-sm text-primary hover:text-primary/80 font-medium">
                          Join Community →
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Coming Soon Badge for non-theme tabs */}
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <Sparkles size={16} className="text-primary mr-2" />
                    <span className="text-sm font-medium text-primary">
                      More options coming soon
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

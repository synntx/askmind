"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, LogOut, ChevronDown } from "lucide-react";

interface HeaderProps {
  onSettingsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen]);

  const menuItems = [
    // {
    //   icon: Palette,
    //   label: "Themes",
    //   description: "Customize appearance",
    //   onClick: () => {
    //     onSettingsClick?.();
    //     setIsDropdownOpen(false);
    //   },
    // },
    {
      icon: Settings,
      label: "Settings",
      description: "App preferences",
      onClick: () => {
        onSettingsClick?.();
        setIsDropdownOpen(false);
      },
    },
    {
      icon: LogOut,
      label: "Sign Out",
      description: "Log out of account",
      onClick: () => {
        console.log("Sign out clicked");
        setIsDropdownOpen(false);
      },
      variant: "danger" as const,
    },
  ];

  return (
    <header className="relative">
      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex mb-3 animate-reveal">
            <h2 className="text-3xl font-medium tracking-tight">Ask</h2>
            <h2 className="text-3xl font-medium tracking-tight text-primary">
              Mind
            </h2>
          </div>
        </div>

        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="group flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-all duration-200 focus:outline-none outline-0"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="flex items-center gap-2">
              <img
                src="https://github.com/shadcn.png"
                alt="Profile"
                className="w-8 h-8 rounded-full transition-all duration-200"
              />
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-foreground">
                  Harsh Yadav
                </div>
                <div className="text-xs text-muted-foreground">
                  harsh@yadav.com
                </div>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                }`}
            />
          </button>

          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-full mt-2 w-72 bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200"
            >
              {/* <div className="p-4 bg-gradient-to-r from-muted/20 to-transparent">
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full">
                      <img
                        src="https://github.com/shadcn.png"
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-foreground truncate">
                        Harsh
                      </span>
                      <div className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md border border-primary/20">
                        Pro
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      harsh@harsh.com
                    </div>
                  </div>
                </div>
              </div>
              */}

              <div className="p-2">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isDanger = item.variant === "danger";

                  return (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={`group w-full flex items-center gap-3 p-3 rounded-xl text-left ${isDanger ? "hover:bg-muted" : "hover:bg-muted/50"
                        }`}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5">
                        <Icon size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {item.label}
                          </span>
                          {/* {item.badge && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                              {item.badge}
                            </span>
                          )} */}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* <div className="p-3 border-t border-border/30 bg-gradient-to-r from-muted/10 to-transparent">
                <div className="text-xs text-muted-foreground text-center">
                  Version 2.1.0 • Last updated 2 hours ago
                </div>
              </div> */}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

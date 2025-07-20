"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface DropdownOption {
  value: string | number;
  label: string;
  group?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  secondaryInfo?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string | number;
  placeholder?: string;
  onSelect: (value: string | number) => void;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  groupIcons?: Record<string, React.ReactNode>;
  recentOptions?: DropdownOption[];
  recentLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  quickSearchKey?: string;
  maxHeight?: number;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  placeholder = "Select an option",
  onSelect,
  disabled = false,
  className = "",
  dropdownClassName = "w-60", //
  groupIcons,
  recentOptions = [],
  recentLabel = "Recent",
  searchable = true,
  searchPlaceholder = "Search...",
  quickSearchKey = "/",
  maxHeight = 320, // max-h-80
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
      if (quickSearchKey && e.key === quickSearchKey && !isOpen) {
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
  }, [isOpen, quickSearchKey]);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  const allOptions = [...options, ...recentOptions];
  const selectedOption = allOptions.find((option) => option.value === value);

  const handleSelect = (optionValue: string | number) => {
    onSelect(optionValue);
    setIsOpen(false);
    setSearch("");
  };

  const filteredOptions = searchable
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(search.toLowerCase()) ||
          option.group?.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const groupedOptions = filteredOptions.reduce(
    (acc, option) => {
      const groupKey = option.group || "ungrouped";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(option);
      return acc;
    },
    {} as Record<string, DropdownOption[]>,
  );

  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const displayIcon = selectedOption ? selectedOption.icon : null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`${isOpen && "bg-muted/40"}
        group flex items-center gap-2 px-3 py-2.5 text-sm
      text-foreground/90 hover:text-foreground hover:bg-muted/40
        rounded-xl transition-all disabled:opacity-50`}
        title={quickSearchKey ? `Press ${quickSearchKey} to search` : undefined}
      >
        {displayIcon && (
          <span className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {displayIcon}
          </span>
        )}
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute top-full left-0 mt-1 bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg z-50 overflow-hidden ${dropdownClassName}`}
        >
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full p-2 py-3 pl-8 pr-3 text-sm bg-background/50 border-none focus:outline-none"
              />
            </div>
          )}

          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {!search && recentOptions.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 text-xs text-muted-foreground">
                  {recentLabel}
                </div>
                {recentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() =>
                      !option.disabled && handleSelect(option.value)
                    }
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/20 transition-colors text-left"
                  >
                    {option.icon && (
                      <span className="w-3.5 h-3.5 opacity-60 flex-shrink-0">
                        {option.icon}
                      </span>
                    )}
                    <span className="flex-1 text-left">{option.label}</span>
                    {option.secondaryInfo && (
                      <span className="text-xs text-muted-foreground">
                        {option.secondaryInfo}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {Object.entries(groupedOptions).map(
              ([group, groupOptions], index) => {
                if (groupOptions.length === 0) return null;
                const groupLabel = group === "ungrouped" ? null : group;
                const GroupIcon =
                  groupIcons && groupLabel ? groupIcons[groupLabel] : null;

                return (
                  <div key={group} className="mb-1">
                    {(index > 0 || (!search && recentOptions.length > 0)) && (
                      <div className="h-px bg-border/30 mx-2 my-1.5" />
                    )}
                    {groupLabel && (
                      <div className="px-3 py-1 text-xs text-muted-foreground uppercase flex items-center gap-1.5">
                        {GroupIcon && (
                          <span className="w-3 h-3">{GroupIcon}</span>
                        )}
                        {groupLabel}
                      </div>
                    )}
                    {groupOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        onClick={() =>
                          !option.disabled && handleSelect(option.value)
                        }
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                          option.value === value
                            ? "bg-accent/40 text-foreground"
                            : "text-foreground/80 hover:bg-muted/40 hover:text-foreground"
                        } ${
                          option.disabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <span className="flex-1 text-left">{option.label}</span>
                        {option.secondaryInfo && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {option.secondaryInfo}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                );
              },
            )}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

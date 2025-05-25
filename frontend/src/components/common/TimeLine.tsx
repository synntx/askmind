"use client";
import React from "react";

interface TimelineItemProps {
  date?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal";
}

export const TimelineItemDisplay: React.FC<TimelineItemProps> = ({
  date,
  title,
  children,
  className,
  orientation = "vertical",
}) => {
  const isHorizontal = orientation === "horizontal";

  return (
    <li
      className={`
        ${isHorizontal ? "inline-block mr-8 last:mr-0 w-64" : "ml-4 mb-8 last:mb-0"}
        ${className || ""}
      `}
    >
      {/* Dot */}
      <div
        className={`
          ${isHorizontal ? "relative -bottom-[9px] mx-auto" : "absolute -left-[5px]"}
          w-2.5 h-2.5 rounded-full bg-muted ring-2 ring-background
        `}
      />

      {/* Content */}
      <div
        className={`
        ${isHorizontal ? "mt-4 text-center overflow-y-auto" : "ml-4"}
        space-y-1.5
      `}
      >
        {title && (
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        )}
        {date && <time className="text-xs text-muted-foreground">{date}</time>}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </li>
  );
};

interface TimelineDisplayProps {
  children: React.ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal";
}

export const TimelineDisplay: React.FC<TimelineDisplayProps> = ({
  children,
  className,
  orientation = "vertical",
}) => {
  const isHorizontal = orientation === "horizontal";

  return (
    <ol
      className={`
        relative my-4
        ${
          isHorizontal
            ? "flex border-t border-border pt-4"
            : "border-l border-border"
        }
        ${className || ""}
      `}
    >
      {children}
    </ol>
  );
};

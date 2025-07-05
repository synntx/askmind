"use client";
import { cn } from "@/lib/utils";
import { Cog } from "lucide-react";
import React from "react";

interface ToolCallProps {
  toolName: string;
  toolDescription?: string;
  className?: string;
  children?: React.ReactNode;
}

const ToolCall: React.FC<ToolCallProps> = ({
  toolName,
  toolDescription,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        "my-4 p-4 border border-border rounded-lg bg-muted/50",
        className,
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <Cog className="w-5 h-5 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{toolName}</span>
          {toolDescription && (
            <span className="text-sm text-muted-foreground">
              {toolDescription}
            </span>
          )}
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
};

export default ToolCall;

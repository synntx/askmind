import React from "react";
import { Info, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface CalloutProps {
  type?: "info" | "warning" | "success" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Callout: React.FC<CalloutProps> = ({
  type = "info",
  title,
  children,
  className,
}) => {
  const styles = {
    info: {
      container: "border-border bg-secondary",
      icon: <Info className="h-4 w-4 text-foreground/70" />,
      title: "text-foreground/90",
    },
    warning: {
      container: `border-[hsl(var(--chart-4)/0.3)] bg-[hsl(var(--chart-4)/0.1)] dark:border-[hsl(var(--chart-4)/0.3)] dark:bg-[hsl(var(--chart-4)/0.1)]`,
      icon: (
        <AlertCircle className="h-4 w-4 text-[hsl(var(--chart-4)/0.7)] dark:text-[hsl(var(--chart-4)/0.7)]" />
      ),
      title: `text-[hsl(var(--chart-4))] dark:text-[hsl(var(--chart-4))]`,
    },
    success: {
      container: `border-[hsl(var(--chart-2)/0.3)] bg-[hsl(var(--chart-2)/0.1)] dark:border-[hsl(var(--chart-2)/0.3)] dark:bg-[hsl(var(--chart-2)/0.1)]`,
      icon: (
        <CheckCircle className="h-4 w-4 text-[hsl(var(--chart-2)/0.7)] dark:text-[hsl(var(--chart-2)/0.7)]" />
      ),
      title: `text-[hsl(var(--chart-2))] dark:text-[hsl(var(--chart-2))]`,
    },
    error: {
      container: "border-destructive/30 bg-destructive/10",
      icon: <XCircle className="h-4 w-4 text-red-500/90" />,
      title: "text-red-500/90 dark:text-red-500/90",
    },
  };

  return (
    <div
      className={`
        flex gap-3 rounded-lg border p-4 my-2
        ${styles[type].container}
        ${className || ""}
      `}
    >
      <div className="mt-0.5 flex-shrink-0">{styles[type].icon}</div>
      <div className="">
        {title && (
          <h4 className={`text-sm font-medium ${styles[type].title}`}>
            {title}
          </h4>
        )}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

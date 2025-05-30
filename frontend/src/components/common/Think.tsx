import { useState } from "react";

interface ThinkTagProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const ThinkTag: React.FC<ThinkTagProps> = ({ children, className, title }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`my-4 ${className || ""}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group w-full text-left"
        type="button"
      >
        <div className="flex items-start gap-2">
          <span className="text-[13px] text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
            {title || "Thinking..."}
          </span>
          <svg
            className={`mt-0.5 h-3 w-3 text-muted-foreground/50 transition-transform duration-200 ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      <div
        className={`grid transition-all duration-200 ease-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100 mt-2"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pl-4 border-l-2 border-border/30 text-[14px] leading-relaxed text-foreground/60">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThinkTag;

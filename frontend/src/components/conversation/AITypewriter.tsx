import React, { useState, useRef, useEffect } from "react";
import { MarkdownContent } from "../common/MarkdownContent";

interface AITypewriterProps {
  content: string;
}

export const AITypewriter: React.FC<AITypewriterProps> = ({ content }) => {
  const [displayedContent, setDisplayedContent] = useState<string>("");
  const lastContentRef = useRef<string>("");
  const animationRef = useRef<number | null>(null);
  const charsPerFrameRef = useRef<number>(15);

  useEffect(() => {
    if (content === lastContentRef.current && displayedContent === content) {
      return;
    }

    lastContentRef.current = content;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    let charIndex = 0;
    if (content.startsWith(displayedContent)) {
      charIndex = displayedContent.length;
    } else {
      setDisplayedContent("");
    }

    const typeNextChunk = () => {
      const charsToAdd = charsPerFrameRef.current;
      charIndex = Math.min(charIndex + charsToAdd, content.length);

      setDisplayedContent(content.slice(0, charIndex));

      if (charIndex < content.length) {
        animationRef.current = requestAnimationFrame(typeNextChunk);
      }
    };

    animationRef.current = requestAnimationFrame(typeNextChunk);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [content, displayedContent]);

  return (
    <div>
      <MarkdownContent content={displayedContent} />
    </div>
  );
};

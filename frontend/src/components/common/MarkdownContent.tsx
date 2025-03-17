"use client";
import React, { ComponentPropsWithoutRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";
import { CheckmarkIcon, CopyIcon } from "@/icons";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = "",
}) => {
  return (
    <div
      className={`prose font-inter prose-lg max-w-none dark:prose-invert prose-headings:font-display prose-p:text-base prose-p:leading-relaxed ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSanitize,
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={{
          table: ({ ...props }) => (
            <div className="my-8 w-full overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <table
                className="w-full border-collapse text-left text-sm"
                {...props}
              />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead
              className="text-xs bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
              {...props}
            />
          ),
          th: ({ ...props }) => (
            <th
              className="border-b border-r border-zinc-200 dark:border-zinc-700 px-6 py-4 font-medium last:border-r-0"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td
              className="border-b border-r border-zinc-200/70 dark:border-zinc-700/50 px-6 py-4 last:border-r-0"
              {...props}
            />
          ),
          tr: ({ className, ...props }) => (
            <tr className={`${className || ""}`} {...props} />
          ),

          h1: ({ ...props }) => (
            <h1
              className="mt-10 mb-6 text-[24px] leading-[32px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="mt-10 mb-5 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-[20px] leading-[28px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="mt-8 mb-4 text-[18px] leading-[26px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              {...props}
            />
          ),
          h4: ({ ...props }) => (
            <h4
              className="mt-6 mb-4 text-[16px] leading-[24px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100"
              {...props}
            />
          ),
          h5: ({ ...props }) => (
            <h5
              className="mt-6 mb-3 text-[15px] leading-[22px] font-medium tracking-tight text-zinc-700 dark:text-zinc-200"
              {...props}
            />
          ),
          h6: ({ ...props }) => (
            <h6
              className="mt-5 mb-3 text-[14px] leading-[20px] font-medium tracking-tight text-zinc-600 dark:text-zinc-300"
              {...props}
            />
          ),

          p: ({ ...props }) => (
            <p
              className="my-4 text-[16px] leading-[26px] text-zinc-800 dark:text-zinc-200"
              {...props}
            />
          ),

          a: ({ href, ...props }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                className="font-medium text-[#8A92E3] decoration-[#8A92E3]/80 decoration-1 underline-offset-2 hover:underline"
                {...props}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {props.children}
              </a>
            );
          },

          ul: ({ className, ...props }) => {
            const isTableOfContents =
              className?.includes("table-of-contents") ||
              (Array.isArray(props.children) &&
                props.children.length > 0 &&
                typeof props.children[0] === "object" &&
                props.children[0]?.props?.href?.startsWith("#"));

            return isTableOfContents ? (
              <div className="my-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-50/80 dark:from-zinc-900 dark:to-zinc-900/80 p-6 shadow-sm">
                <h4 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Table of Contents
                </h4>
                <ul
                  className="space-y-1 text-zinc-700 dark:text-zinc-300"
                  {...props}
                />
              </div>
            ) : (
              <ul
                className="my-5 ml-6 list-disc marker:text-zinc-500 dark:marker:text-zinc-400 space-y-2"
                {...props}
              />
            );
          },

          ol: ({ ...props }) => (
            <ol
              className="my-5 ml-6 list-decimal marker:font-medium marker:text-zinc-600 dark:marker:text-zinc-400 space-y-2"
              {...props}
            />
          ),

          li: ({ ...props }) => {
            const isTocItem =
              Array.isArray(props.children) &&
              props.children.length > 0 &&
              typeof props.children[0] === "object" &&
              props.children[0]?.props?.href?.startsWith("#");

            return isTocItem ? (
              <li
                className="text-[14px] hover:text-[#8A92E3]/80 transition-colors"
                {...props}
              />
            ) : (
              <li
                className="text-[16px] leading-[26px] text-zinc-700 dark:text-zinc-300"
                {...props}
              />
            );
          },

          blockquote: ({ ...props }) => (
            <blockquote
              className="my-6 border-l-4 border-[#8A92E3]/40 bg-[#8A92E3]/5 py-3 pl-6 pr-4 italic text-[15px] leading-[24px] text-zinc-700 dark:text-zinc-300"
              {...props}
            />
          ),

          hr: ({ ...props }) => (
            <hr
              className="my-8 h-px bg-gradient-to-r from-zinc-200 via-zinc-400/50 to-zinc-200 dark:from-zinc-800 dark:via-zinc-600/50 dark:to-zinc-800 border-0"
              {...props}
            />
          ),

          img: ({ alt, ...props }) => (
            <figure className="my-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rounded-lg mx-auto"
                alt={alt || ""}
                loading="lazy"
                {...props}
              />
              {alt && (
                <figcaption className="mt-2 text-center text-[13px] text-zinc-500 dark:text-zinc-400 italic">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),

          code: CodeBlock,
          pre: ({ ...props }) => (
            <pre className="my-0 bg-transparent p-0 text-[14px]" {...props} />
          ),

          strong: ({ ...props }) => (
            <strong
              className="font-semibold text-zinc-900 dark:text-zinc-100"
              {...props}
            />
          ),

          em: ({ ...props }) => (
            <em
              className="italic text-zinc-800 dark:text-zinc-200"
              {...props}
            />
          ),

          details: ({ ...props }) => (
            <details
              className="my-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 transition-all hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 shadow-sm"
              {...props}
            />
          ),

          summary: ({ ...props }) => (
            <summary
              className="cursor-pointer font-medium text-[15px] leading-[24px] text-zinc-800 dark:text-zinc-200 hover:text-[#8A92E3] dark:hover:text-[#8A92E3]/60 transition-colors"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

type CodeBlockProps = {
  className?: string;
  children?: React.ReactNode;
  inline?: boolean;
  node?: {
    properties?: {
      className?: string[];
    };
  };
} & Omit<ComponentPropsWithoutRef<"code">, "className" | "children">;

const CodeBlock: React.FC<CodeBlockProps> = ({
  className,
  children,
  ...props
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const isInline =
    !className && typeof children === "string" && !children.includes("\n");

  // Enhanced copy function
  const copyToClipboard = () => {
    const textToCopy = children?.toString() || "";

    // Handle potential HTML content
    const tempElement = document.createElement("div");
    tempElement.innerHTML = textToCopy;
    const plainText =
      tempElement.textContent || tempElement.innerText || textToCopy;

    navigator.clipboard.writeText(plainText).then(
      () => {
        console.log("Text copied to clipboard");
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      },
    );
  };

  return isInline ? (
    <code
      className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[14px] text-zinc-800 dark:text-zinc-200"
      {...props}
    >
      {children}
    </code>
  ) : (
    <div className="relative my-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-sm">
      <div className="flex h-10 items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80">
        <div className="flex items-center gap-2">
          {language && (
            <span className="text-[13px] text-right font-mono text-zinc-500 dark:text-zinc-400">
              {language}
            </span>
          )}
        </div>
        <button
          className="text-zinc-400/70 hover:text-zinc-400 hover:bg-secondary dark:text-zinc-400/50 dark:hover:text-zinc-200/80 transition-colors p-1.5 rounded-md"
          onClick={copyToClipboard}
          title={isCopied ? "Copied!" : "Copy code"}
          type="button"
        >
          {isCopied ? <CheckmarkIcon stroke="#4ade80" /> : <CopyIcon />}
        </button>
      </div>
      <div className="overflow-auto">
        <code
          className={`${className || ""} bg-white font-mono block overflow-x-auto p-4 text-[14px] text-zinc-800 dark:text-zinc-200`}
          {...props}
        >
          {children}
        </code>
      </div>
    </div>
  );
};

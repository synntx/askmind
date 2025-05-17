"use client";
import React, { ComponentPropsWithoutRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
// import "highlight.js/styles/github-dark.css";
import { CheckmarkIcon, CopyIcon } from "@/icons";

import "../../app/highlight-styles.css";

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
            <div className="my-8 w-full overflow-y-auto rounded-lg border border-border">
              <table
                className="w-full border-collapse text-left text-sm"
                {...props}
              />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead
              className="text-xs bg-secondary text-secondary-foreground uppercase tracking-wider"
              {...props}
            />
          ),
          th: ({ ...props }) => (
            <th
              className="border-b border-r border-border px-6 py-4 font-medium last:border-r-0"
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td
              className="border-b text-foreground/80 border-r border-border px-6 py-4 last:border-r-0"
              {...props}
            />
          ),
          tr: ({ className, ...props }) => (
            <tr className={`${className || ""}`} {...props} />
          ),

          h1: ({ ...props }) => (
            <h1
              className="mt-10 mb-6 text-[24px] leading-[32px] font-bold tracking-tight text-foreground"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="mt-10 mb-5 border-b border-border pb-2 text-[20px] leading-[28px] font-semibold tracking-tight text-foreground"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="mt-8 mb-4 text-[18px] leading-[26px] font-semibold tracking-tight text-foreground"
              {...props}
            />
          ),
          h4: ({ ...props }) => (
            <h4
              className="mt-6 mb-4 text-[16px] leading-[24px] font-semibold tracking-tight text-foreground"
              {...props}
            />
          ),
          h5: ({ ...props }) => (
            <h5
              className="mt-6 mb-3 text-[15px] leading-[22px] font-medium tracking-tight text-foreground/90"
              {...props}
            />
          ),
          h6: ({ ...props }) => (
            <h6
              className="mt-5 mb-3 text-[14px] leading-[20px] font-medium tracking-tight text-foreground/80"
              {...props}
            />
          ),

          p: ({ ...props }) => (
            <p
              className="my-4 text-[16px] leading-[26px] text-foreground/75"
              {...props}
            />
          ),

          a: ({ href, ...props }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                className="font-medium text-primary decoration-primary/80 decoration-1 underline-offset-2 hover:underline"
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
              <div className="my-6 rounded-lg border border-border bg-gradient-to-br from-background to-muted/80 p-6">
                <h4 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                  Table of Contents
                </h4>
                <ul className="space-y-1 text-foreground/80" {...props} />
              </div>
            ) : (
              <ul
                className="my-5 ml-6 list-disc marker:text-muted-foreground space-y-2"
                {...props}
              />
            );
          },

          ol: ({ ...props }) => (
            <ol
              className="my-5 ml-6 list-decimal marker:font-medium marker:text-muted-foreground space-y-2"
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
                className="text-[14px] hover:text-primary/80 transition-colors"
                {...props}
              />
            ) : (
              <li
                className="text-[16px] leading-[26px] text-foreground/90"
                {...props}
              />
            );
          },

          blockquote: ({ ...props }) => (
            <blockquote
              className="my-6 border-l-4 border-primary/40 bg-primary/5 py-3 pl-6 pr-4 italic text-[15px] leading-[24px] text-foreground/80"
              {...props}
            />
          ),

          hr: ({ ...props }) => (
            <hr
              className="my-8 h-px bg-gradient-to-r from-border via-muted-foreground/50 to-border border-0"
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
                <figcaption className="mt-2 text-center text-[13px] text-muted-foreground italic">
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
            <strong className="font-semibold text-foreground/90" {...props} />
          ),

          em: ({ ...props }) => (
            <em className="italic text-foreground/90" {...props} />
          ),

          details: ({ ...props }) => (
            <details
              className="my-5 rounded-lg border border-border bg-muted/50 p-4 transition-all hover:bg-muted/80"
              {...props}
            />
          ),

          summary: ({ ...props }) => (
            <summary
              className="cursor-pointer font-medium text-[15px] leading-[24px] text-foreground hover:text-primary dark:hover:text-primary/60 transition-colors"
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
    // const textToCopy = children?.toString() || "";
    const textToCopy = getTextFromChildren(children);

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
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[14px] text-foreground/90"
      {...props}
    >
      {children}
    </code>
  ) : (
    <div className="relative my-6 overflow-hidden rounded-lg border border-border dark:border-muted bg-card">
      <div className="flex h-10 items-center justify-between px-4 border-b border-border dark:border-muted bg-muted">
        <div className="flex items-center gap-2">
          {language && (
            <span className="text-[13px] text-right font-mono text-muted-foreground">
              {language}
            </span>
          )}
        </div>
        <button
          className="text-muted-foreground/70 hover:text-muted-foreground hover:bg-secondary transition-colors p-1.5 rounded-md"
          onClick={copyToClipboard}
          title={isCopied ? "Copied!" : "Copy code"}
          type="button"
        >
          {isCopied ? (
            <CheckmarkIcon className="stroke-green-500" />
          ) : (
            <CopyIcon />
          )}
        </button>
      </div>
      <div className="overflow-auto">
        <code
          className={`${className || ""} bg-background font-mono block overflow-x-auto p-4 text-[14px] text-foreground/90`}
          {...props}
        >
          {children}
        </code>
      </div>
    </div>
  );
};

function getTextFromChildren(nodes: React.ReactNode): string {
  let text = "";

  React.Children.forEach(nodes, (node) => {
    if (typeof node === "string" || typeof node === "number") {
      text += node;
    } else if (Array.isArray(node)) {
      node.forEach((child) => {
        text += getTextFromChildren(child);
      });
    } else if (
      React.isValidElement<{ children?: React.ReactNode }>(node) &&
      node.props.children
    ) {
      text += getTextFromChildren(node.props.children);
    }
  });

  return text;
}

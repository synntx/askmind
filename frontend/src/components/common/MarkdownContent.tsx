"use client";
import React, {
  ComponentPropsWithoutRef,
  CSSProperties,
  useState,
} from "react";
import ReactMarkdown, { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, Options } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { CheckmarkIcon, CopyIcon } from "@/icons";
import { Element } from "hast";

import "../../app/highlight-styles.css";
import { GalleryImageItem, ImageGallery } from "./ImageGallery";
import { UserProfileCard } from "./UserProfileCard";
import { TimelineDisplay, TimelineItemDisplay } from "./TimeLine";
import { Callout } from "./CallOut";
import ThinkTag from "./Think";
import ToolCall from "./ToolCall";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// <image-gallery layout="grid-3">
//   <gallery-item src="url1.jpg" alt="Alt 1" caption="Caption for Image 1"></gallery-item>
//   <gallery-item src="url2.png" alt="Alt 2"></gallery-item>
// </image-gallery>

interface CitationDef {
  text: string;
  url?: string;
}

interface CitationsListDisplayProps {
  title?: string;
  items: CitationDef[];
  className?: string;
}

const CitationsListDisplay: React.FC<CitationsListDisplayProps> = ({
  title,
  items,
  className,
}) => {
  return (
    <div className={`my-6 py-4 px-2 rounded-lg ${className || ""}`}>
      {title && (
        <h5 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h5>
      )}
      <ul className="list-none p-0 m-0 space-y-1.5">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-[14px] leading-relaxed text-foreground/85"
          >
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline decoration-primary/50 hover:decoration-primary"
              >
                {item.text}
              </a>
            ) : (
              item.text
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

interface YouTubeEmbedProps {
  videoId: string;
  width?: string | number;
  height?: string | number;
  title?: string;
  className?: string;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  width: propWidth,
  height: propHeight,
  title = "YouTube video player",
  className,
}) => {
  const hasSpecificDimensions = propWidth || propHeight;

  const iframeElement = (
    <iframe
      className="absolute top-0 left-0 w-full h-full border-0"
      src={`https://www.youtube.com/embed/${videoId}`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );

  if (hasSpecificDimensions) {
    const style: CSSProperties = {
      width: propWidth
        ? typeof propWidth === "number"
          ? `${propWidth}px`
          : propWidth
        : "100%",
      aspectRatio:
        propWidth && propHeight
          ? `${Number(String(propWidth).replace("px", ""))}/${Number(String(propHeight).replace("px", ""))}`
          : "16/9",
      maxWidth: "100%",
    };
    if (propHeight) {
      style.height =
        typeof propHeight === "number" ? `${propHeight}px` : propHeight;
      if (propWidth) delete style.aspectRatio;
    }

    return (
      <div className={`my-6 relative ${className || ""}`} style={style}>
        {iframeElement}
      </div>
    );
  } else {
    return (
      <div
        className={`my-6 relative w-full overflow-hidden ${className || ""}`}
        style={{ paddingTop: "56.25%" }}
      >
        {iframeElement}
      </div>
    );
  }
};

export const Divider: React.FC = () => {
  return <hr className="my-8 border-border" />;
};

export const Spacer: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "md",
}) => {
  const sizes = {
    sm: "my-2",
    md: "my-4",
    lg: "my-8",
  };
  return <div className={sizes[size]} />;
};

export const Grid: React.FC<{
  cols?: string;
  gap?: string;
  children: React.ReactNode;
}> = ({ cols = "2", gap = "4", children }) => {
  return (
    <div
      className={cn("grid my-4", `grid-cols-${cols}`, `gap-${gap}`)}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: `${Number(gap) * 0.25}rem`,
      }}
    >
      {children}
    </div>
  );
};

export const Flex: React.FC<{
  direction?: "row" | "col";
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "end" | "between";
  gap?: string;
  children: React.ReactNode;
}> = ({
  direction = "row",
  align = "start",
  justify = "start",
  gap = "4",
  children,
}) => {
  return (
    <div
      className={cn(
        "flex my-4",
        direction === "col" ? "flex-col" : "flex-row",
        `items-${align}`,
        `justify-${justify}`,
        `gap-${gap}`,
      )}
    >
      {children}
    </div>
  );
};

const sanitizeSchema: Options = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "image-gallery",
    "gallery-item",
    "user-profile",
    "citations-list",
    "citation-item",
    "youtube-video",
    "timeline-display",
    "timeline-item",
    "callout",
    "think",
    "tool-call",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "image-gallery": ["layout", "className", "class"],
    "gallery-item": [
      "src",
      "alt",
      "title",
      "caption",
      "className",
      "class",
      "index",
    ],
    "user-profile": [
      "name",
      "title",
      "avatarurl",
      "profileurl",
      "classname",
      "class",
    ],
    "citations-list": ["title", "className", "class"],
    "citation-item": ["text", "url", "className", "class"],
    "youtube-video": [
      "videoid",
      "width",
      "height",
      "title",
      "className",
      "class",
    ],
    "timeline-display": ["orientation", "className", "class"],
    "timeline-item": ["date", "title", "type", "icon", "className", "class"],
    callout: ["type", "title", "className", "class"],
    think: ["className", "class", "title"],
    "tool-call": ["toolname", "tooldescription", "className", "class"],
    "*": [
      ...(defaultSchema.attributes?.["*"] || []),
      "className",
      "class",
      "id",
    ],
  },
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = "",
}) => {
  const customComponents: Components = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "image-gallery": (props: any) => {
      const { node, children, ...rest } = props;
      const layout = node?.properties?.layout || rest.layout || "grid-3";
      const images: GalleryImageItem[] = [];

      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          interface ChildElementPropsWithNode {
            node: Element;
            key?: React.Key;
          }

          const typedChildProps = child.props as ChildElementPropsWithNode;

          const childNode = typedChildProps.node;
          if (childNode && childNode.tagName === "gallery-item") {
            const itemProps = childNode.properties || {};
            console.log("Item Props: ", itemProps);
            if (itemProps.src) {
              images.push({
                src: itemProps.src as string,
                alt: (itemProps.alt as string) || "",
                title:
                  (itemProps.caption as string) ||
                  (itemProps.title as string) ||
                  (itemProps.alt as string),
                index: (itemProps.index as number) || undefined,
              });
            }
          }
        }
      });
      return <ImageGallery images={images} layout={layout} />;
    },
    "gallery-item": () => null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "user-profile": (props: any) => {
      const { node } = props;
      const userProps = node?.properties || {};
      const name = userProps.name;
      let cardClassName: string | undefined = undefined;
      if (userProps.className && Array.isArray(userProps.className)) {
        cardClassName = userProps.className.join(" ");
      } else if (userProps.className) {
        cardClassName = String(userProps.className);
      }

      return (
        <UserProfileCard
          name={name}
          title={userProps.title as string | undefined}
          avatarUrl={userProps.avatarurl as string | undefined}
          profileUrl={userProps.profileurl as string | undefined}
          className={cardClassName as string | undefined}
        />
      );
    },
    // eslint-disable-next-line
    "citations-list": (props: any) => {
      const { node, children } = props;
      const listNodeProps = node?.properties || {};
      const title = listNodeProps.title as string | undefined;

      let listClassName: string | undefined = undefined;
      if (listNodeProps.className && Array.isArray(listNodeProps.className)) {
        listClassName = listNodeProps.className.join(" ");
      } else if (listNodeProps.className) {
        listClassName = String(listNodeProps.className);
      }

      const items: CitationDef[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          interface ChildElementPropsWithNode {
            node: Element; // HAST Element
            key?: React.Key;
          }
          const typedChildProps = child.props as ChildElementPropsWithNode;
          const childNode = typedChildProps.node;

          if (childNode && childNode.tagName === "citation-item") {
            const itemHastProps = childNode.properties || {};
            const text = itemHastProps.text as string;
            const url = itemHastProps.url as string | undefined;
            if (text) {
              items.push({ text, url });
            }
          }
        }
      });
      return (
        <CitationsListDisplay
          title={title}
          items={items}
          className={listClassName}
        />
      );
    },
    "citation-item": () => null,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "youtube-video": (props: any) => {
      const { node } = props;
      const videoNodeProps = node?.properties || {};
      const videoId = videoNodeProps.videoid as string;

      if (!videoId) {
        console.warn("<youtube-video> tag is missing 'videoid' attribute.");
        return null;
      }

      let videoClassName: string | undefined = undefined;
      if (videoNodeProps.className && Array.isArray(videoNodeProps.className)) {
        videoClassName = videoNodeProps.className.join(" ");
      } else if (videoNodeProps.className) {
        videoClassName = String(videoNodeProps.className);
      }

      return (
        <YouTubeEmbed
          videoId={videoId}
          width={videoNodeProps.width as string | number | undefined}
          height={videoNodeProps.height as string | number | undefined}
          title={videoNodeProps.title as string | undefined}
          className={videoClassName}
        />
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "timeline-display": (props: any) => {
      const { node, children, ...rest } = props;
      const nodeProps = node?.properties || {};
      const orientation =
        (nodeProps.orientation as "vertical" | "horizontal" | undefined) ||
        rest.orientation;
      let timelineClassName: string | undefined = undefined;
      if (nodeProps.className && Array.isArray(nodeProps.className)) {
        timelineClassName = nodeProps.className.join(" ");
      } else if (nodeProps.className) {
        timelineClassName = String(nodeProps.className);
      }

      const processedChildren = React.Children.map(children, (child) => {
        if (
          React.isValidElement(child) &&
          // eslint-disable-next-line
          (child.props as any).node?.tagName === "timeline-item"
        ) {
          //@ts-expect-error ignore
          return React.cloneElement(child, { ...child.props });
        }
        return child;
      });
      return (
        <TimelineDisplay
          orientation={orientation}
          className={timelineClassName}
        >
          {processedChildren}
        </TimelineDisplay>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "timeline-item": (props: any) => {
      const { node, children, ...rest } = props;
      const nodeProps = node?.properties || {};
      const date = (nodeProps.date as string | undefined) || rest.date;
      const title = (nodeProps.title as string | undefined) || rest.title;
      const icon = (nodeProps.icon as string | undefined) || rest.icon;
      let itemClassName: string | undefined = undefined;
      if (nodeProps.className && Array.isArray(nodeProps.className)) {
        itemClassName = nodeProps.className.join(" ");
      } else if (nodeProps.className) {
        itemClassName = String(nodeProps.className);
      }

      const orientation = nodeProps?.orientation as string | undefined;

      return (
        <TimelineItemDisplay
          date={date}
          title={title}
          icon={icon}
          className={itemClassName}
          orientation={orientation}
          {...rest}
        >
          {children}
        </TimelineItemDisplay>
      );
    },
    // eslint-disable-next-line
    callout: (props: any) => {
      const { node, children } = props;
      const nodeProps = node?.properties || {};

      return (
        <Callout
          type={nodeProps.type as "info" | "warning" | "success" | "error"}
          title={nodeProps.title as string}
          className={nodeProps.className as string}
        >
          {children}
        </Callout>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    think: (props: any) => {
      const { node, children } = props;
      const nodeProps = node?.properties || {};

      let thinkClassName: string | undefined = undefined;
      if (nodeProps.className && Array.isArray(nodeProps.className)) {
        thinkClassName = nodeProps.className.join(" ");
      } else if (nodeProps.className) {
        thinkClassName = String(nodeProps.className);
      }

      return (
        <ThinkTag className={thinkClassName} title={nodeProps.title as string}>
          {children}
        </ThinkTag>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "tool-call": (props: any) => {
      const { node, children } = props;
      const nodeProps = node?.properties || {};

      let toolCallClassName: string | undefined = undefined;
      if (nodeProps.className && Array.isArray(nodeProps.className)) {
        toolCallClassName = nodeProps.className.join(" ");
      } else if (nodeProps.className) {
        toolCallClassName = String(nodeProps.className);
      }
      const toolName = nodeProps.toolname as string;
      const toolDescription = nodeProps.tooldescription as string;

      return (
        <ToolCall
          toolName={toolName}
          toolDescription={toolDescription}
          className={toolCallClassName}
        >
          {children}
        </ToolCall>
      );
    },
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
        className="mt-6 mb-3 text-[15px] leading-[22px] font-medium tracking-tight text-foreground/95"
        {...props}
      />
    ),
    h6: ({ ...props }) => (
      <h6
        className="mt-5 mb-3 text-[14px] leading-[20px] font-medium tracking-tight text-foreground/90"
        {...props}
      />
    ),

    p: ({ node, children, ...props }) => {
      if (
        node &&
        node.children &&
        node.children.length === 1 &&
        node.children[0].type === "element"
      ) {
        return <>{children}</>;
      }
      return (
        <p
          className="my-4 text-[16.5px] leading-[27px] text-foreground/85"
          {...props}
        >
          {children}
        </p>
      );
    },

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
          <ul className="space-y-1 text-foreground/90" {...props} />
        </div>
      ) : (
        <ul
          className="my-5 ml-6 list-disc marker:text-muted-foreground space-y-2 text-foreground/90"
          {...props}
        />
      );
    },

    ol: ({ ...props }) => (
      <ol
        className="my-5 ml-6 list-decimal marker:font-medium marker:text-muted-foreground text-foreground/90 space-y-2"
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
        className="my-6 border-l-4 border-primary/40 bg-primary/5 py-3 pl-6 pr-4 italic text-[15px] leading-[24px] text-foreground/90"
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
      <strong className="font-semibold text-foreground/95" {...props} />
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
  } as Components;

  return (
    <div
      className={`prose font-onest prose-lg max-w-none dark:prose-invert prose-headings:font-display prose-p:text-base prose-p:leading-relaxed ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={customComponents}
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

  const copyToClipboard = () => {
    const textToCopy = getTextFromChildren(children);

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
    <div className="relative my-6 overflow-hidden rounded-lg border border-primary/5 bg-card">
      <div className="flex h-10 items-center justify-between px-4 border-b border-border bg-muted">
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
            <CheckmarkIcon className="stroke-primary" />
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

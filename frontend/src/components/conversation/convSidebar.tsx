"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, HelpCircle, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useGetConversations } from "@/hooks/useConversation";
import Link from "next/link";
import { EditLight, TrashLight, MenuIcon } from "@/icons";
import { useToast } from "../ui/toast";

interface ConvSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
    <HelpCircle size={24} className="text-destructive mb-2" />
    <h3 className="text-sm font-medium text-foreground mb-2">
      Unable to load conversations
    </h3>
    <p className="text-muted-foreground text-xs mb-3">{message}</p>
    <button
      onClick={onRetry}
      className="px-3 py-1.5 bg-destructive/5 text-destructive rounded-lg text-xs hover:bg-destructive/10 transition-colors"
    >
      Try Again
    </button>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
    <Sparkles size={24} className="text-primary mb-2" />
    <h3 className="text-sm font-medium text-foreground mb-2">
      No conversations yet
    </h3>
    <p className="text-muted-foreground text-xs">Start a new chat to begin</p>
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-8 px-4">
    <div className="animate-pulse flex flex-col items-start w-full gap-3">
      <div className="h-4 w-[85%] bg-muted rounded" />
      <div className="h-4 w-[70%] bg-muted rounded" />
      <div className="h-4 w-[90%] bg-muted rounded" />
    </div>
  </div>
);

const ConvSidebar: React.FC<ConvSidebarProps> = ({
  collapsed,
  setCollapsed,
}) => {
  const {
    space_id,
    conversation_id,
  }: { space_id: string; conversation_id?: string } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { data, error, isError, isPending, refetch } =
    useGetConversations(space_id);

  const [selectedChat, setSelectedChat] = useState<string | null>(
    conversation_id || null,
  );
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedChat(conversation_id || null);
    setIsEditing(null);
  }, [conversation_id]);

  const conversations = data || [];

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alert(`Implement delete functionality for chat ID: ${id}`);
    if (selectedChat === id) {
      router.push(`/space/${space_id}/c/new`);
    }
  };

  const handleEditChat = (_id: string, newTitle: string) => {
    toast.addToast(`Your chnages have been saved`, "success", {
      variant: "magical",
      duration: 1500,
      description: `Chat has been edited to "${newTitle.substring(0, 20)}..."`,
      // action: {
      //   label: "View chat now >",
      //   onClick: () => {
      //     router.push(`/space/${space_id}/c/${id}`);
      //   },
      // },
    });
    setIsEditing(null);
  };

  const startNewChat = () => {
    router.push(`/space/${space_id}/c/new`);
    setSelectedChat(null);
    setCollapsed(false);
  };

  return (
    <div
      className={`
        h-screen bg-sidebar flex flex-col rounded-r-2xl
        ${collapsed ? "w-0" : "w-80"} text-foreground
        overflow-hidden transition-all duration-300 relative border-r border-border/50
      `}
      style={{ overflowX: "hidden" }}
    >
      <div
        className={`
          flex items-center justify-between p-3 mx-2 my-2 mb-3
          transition-opacity duration-200
          ${collapsed ? "opacity-0 invisible" : "opacity-100 visible"}
        `}
      >
        <Link
          href={`/space/${space_id}`}
          className="flex hover:opacity-80 transition-opacity"
        >
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Ask
          </h2>
          <h2 className="text-xl font-semibold tracking-tight text-primary">
            Mind
          </h2>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-muted/60 text-muted-foreground absolute top-4 right-3 z-10 transition-colors"
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
        >
          <MenuIcon className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div
        className={`
          px-4 pb-3 transition-opacity duration-200
          ${collapsed ? "opacity-0 invisible pointer-events-none" : "opacity-100 visible"}
        `}
      >
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-card border border-border hover:border-border transition-all duration-150 active:scale-[0.98]"
        >
          <Plus size={18} className="text-primary" />
          <span className="font-medium text-sm text-foreground">New chat</span>
        </button>
      </div>

      <div
        ref={chatListRef}
        className={`
          flex-1 overflow-y-auto px-2 pt-1 pb-4 custom-scrollbar
          transition-opacity duration-200
          ${collapsed ? "opacity-0 invisible pointer-events-none" : "opacity-100 visible"}
        `}
      >
        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState
            message={error?.message || "Something went wrong"}
            onRetry={() => refetch()}
          />
        ) : conversations.length === 0 ? (
          <EmptyState />
        ) : (
          conversations.map((chat) => (
            <div key={chat.conversation_id} className="px-2 group">
              <Link
                href={`/space/${space_id}/c/${chat.conversation_id}`}
                className={`
                  flex items-center justify-between my-1 px-3 py-2
                  rounded-lg cursor-pointer transition-colors duration-150
                  ${
                    selectedChat === chat.conversation_id
                      ? "bg-muted/40"
                      : "hover:bg-muted/30 bg-transparent"
                  }
                `}
                onClick={() => setSelectedChat(chat.conversation_id)}
                aria-current={
                  selectedChat === chat.conversation_id ? "page" : undefined
                }
              >
                <div className="flex-1 min-w-0 pr-2">
                  {isEditing === chat.conversation_id ? (
                    <input
                      type="text"
                      defaultValue={chat.title}
                      autoFocus
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEditChat(
                            chat.conversation_id,
                            (e.target as HTMLInputElement).value,
                          );
                        } else if (e.key === "Escape") {
                          setIsEditing(null);
                        }
                      }}
                      onBlur={(e) =>
                        setTimeout(() => {
                          if (isEditing === chat.conversation_id) {
                            handleEditChat(
                              chat.conversation_id,
                              e.target.value,
                            );
                          }
                        }, 100)
                      }
                      className="w-full px-2 py-1 text-sm rounded bg-card border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  ) : (
                    <div className="truncate text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                      {chat.title}
                    </div>
                  )}
                </div>

                {isEditing !== chat.conversation_id && (
                  <div
                    className={`
                      flex items-center flex-shrink-0 gap-1
                      transition-opacity duration-100 ease-in-out
                      ${
                        selectedChat === chat.conversation_id
                          ? "opacity-100 visible"
                          : "opacity-0 invisible group-hover:opacity-100 group-hover:visible"
                      }
                    `}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditing(chat.conversation_id);
                      }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150"
                      title="Edit title"
                      aria-label="Edit chat title"
                    >
                      <EditLight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(chat.conversation_id, e)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-all duration-150"
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <TrashLight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConvSidebar;

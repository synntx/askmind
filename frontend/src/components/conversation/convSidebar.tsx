"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  HelpCircle,
  Settings,
  Search,
  Star,
  StarOff,
  Clock,
  X,
  Sparkles,
  PanelLeft,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useGetConversations } from "@/hooks/useConversation";
import Link from "next/link";

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <HelpCircle size={24} className="text-red-400 mb-2" />
      <h3 className="text-sm font-medium text-[#CACACA] mb-2">
        Unable to load conversations
      </h3>
      <p className="text-[#CACACA]/60 text-xs mb-3">{message}</p>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 bg-red-500/5 text-red-400 rounded-lg text-xs hover:bg-red-500/10 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
};

const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <Sparkles size={24} className="text-[#8A92E3] mb-2" />
      <h3 className="text-sm font-medium text-[#CACACA] mb-2">
        No conversations yet
      </h3>
      <p className="text-[#CACACA]/50 text-xs">
        Start a new chat to begin asking questions
      </p>
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="animate-pulse flex flex-col items-start w-full gap-3">
        <div className="h-4 w-[85%] bg-[#303134] rounded"></div>
        <div className="h-4 w-[70%] bg-[#303134] rounded"></div>
        <div className="h-4 w-[90%] bg-[#303134] rounded"></div>
        <div className="h-4 w-[60%] bg-[#303134] rounded"></div>
        <div className="h-4 w-[75%] bg-[#303134] rounded"></div>
      </div>
    </div>
  );
};

interface ConvSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const ConvSidebar = ({ collapsed, setCollapsed }: ConvSidebarProps) => {
  const {
    space_id,
    conversation_id,
  }: { space_id: string; conversation_id?: string } = useParams();
  const router = useRouter();
  const { data, error, isError, isPending, refetch } =
    useGetConversations(space_id);
  const [selectedChat, setSelectedChat] = useState<string | null>(
    conversation_id || null,
  );
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "favorites" | "recent"
  >("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation_id) {
      setSelectedChat(conversation_id);
    }
  }, [conversation_id]);

  const filteredConversations = data?.filter((chat) => {
    const matchesSearch = chat.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (activeFilter === "favorites") {
      return matchesSearch && favorites.includes(chat.conversation_id);
    } else if (activeFilter === "recent") {
      return matchesSearch && data.indexOf(chat) < 5;
    }

    return matchesSearch;
  });

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Implement delete functionality
    console.log("Delete chat:", id);
    // After successful deletion, refetch the conversations
    // refetch();
  };

  const handleEditChat = (id: string, newTitle: string) => {
    // Implement edit functionality
    console.log("Edit chat:", id, newTitle);
    setIsEditing(null);
    // After successful edit, refetch the conversations
    // refetch();
  };

  return (
    <div
      className={`h-screen bg-sidebar flex flex-col ${
        collapsed ? "w-0" : "w-80"
      } text-gray-300 overflow-hidden transition-all duration-300 relative border-r border-[#2c2d31]/50`}
      style={{ overflowX: "hidden" }}
    >
      <div
        className={`flex items-center justify-between p-3 mx-2 my-2 mb-3 ${collapsed ? "opacity-0" : "opacity-100"}`}
      >
        {!collapsed && (
          <Link href="/" className="flex hover:opacity-80 transition-opacity">
            <h2 className="text-2xl font-semibold tracking-tight">Ask</h2>
            <h2 className="text-2xl font-semibold tracking-tight text-[#8A92E3]">
              Mind
            </h2>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-muted "
        >
          <PanelLeft
            size={20}
            className={`text-[#CACACA] transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      <div
        className={`${collapsed ? "px-2 w-0" : "px-4 w-full"} pb-3 transition-all duration-300`}
      >
        <button
          className={`flex items-center ${
            collapsed ? "w-full justify-center" : "gap-2"
          } hover:bg-[#303134] text-gray-300 py-3 ${
            collapsed
              ? "px-2 opacity-0 pointer-events-none"
              : "px-4 opacity-100"
          } rounded-full transition-all duration-150 active:scale-[0.95] ease-in-out bg-gradient-to-r from-[#8A92E3]/10 to-[#8A92E3]/20 hover:from-[#8A92E3]/15 hover:to-[#8A92E3]/25`}
          onClick={() => router.push("new")}
        >
          <Plus size={18} className={collapsed ? "" : "text-[#8A92E3]"} />
          {!collapsed && <span className="font-medium text-sm">New chat</span>}
        </button>
      </div>

      <>
        <div
          className={`px-4 mb-2 transition-all duration-300 ${collapsed ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"}`}
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card text-[#CACACA] rounded-lg px-9 py-2 text-sm border border-transparent focus:border-[#8A92E3]/30 focus:outline-none transition-colors"
            />
            <Search
              size={16}
              className="absolute left-3 top-2.5 text-[#CACACA]/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-[#CACACA]/60 hover:text-[#CACACA]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div
          className={`px-4 mb-2 flex space-x-1 transition-all duration-300 ${collapsed ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"}`}
        >
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              activeFilter === "all"
                ? "bg-[#8A92E3]/10 text-[#8A92E3]"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("favorites")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              activeFilter === "favorites"
                ? "bg-[#8A92E3]/10 text-[#8A92E3]"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <Star size={12} /> Favorites
          </button>
          <button
            onClick={() => setActiveFilter("recent")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              activeFilter === "recent"
                ? "bg-[#8A92E3]/10 text-[#8A92E3]"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <Clock size={12} /> Recent
          </button>
        </div>
        <div
          ref={chatListRef}
          className={`flex-1 overflow-y-auto px-4 pt-2 pb-4 custom-scrollbar transition-all duration-300 ${collapsed ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"}`} // Add opacity and pointer-events, h-0
        >
          {isPending ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState
              message={error?.message || "Something went wrong"}
              onRetry={() => refetch()}
            />
          ) : !filteredConversations || filteredConversations.length === 0 ? (
            searchQuery ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                <Search size={24} className="text-[#CACACA]/40 mb-2" />
                <p className="text-[#CACACA]/60 text-xs">
                  No results found for {`"${searchQuery}"`}
                </p>
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            <>
              {filteredConversations
                .slice(0, showMore ? undefined : 5)
                .map((chat) => (
                  <div key={chat.conversation_id}>
                    <Link
                      href={`/space/${space_id}/c/${chat.conversation_id}`}
                      className={`group flex items-center justify-between my-1.5 px-3 py-2 hover:bg-muted/30 cursor-pointer rounded-lg ${
                        selectedChat === chat.conversation_id
                          ? "bg-muted/20"
                          : "bg-transparent"
                      }`}
                      onClick={() => setSelectedChat(chat.conversation_id)}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        {isEditing === chat.conversation_id ? (
                          <input
                            type="text"
                            defaultValue={chat.title}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleEditChat(
                                  chat.conversation_id,
                                  e.currentTarget.value,
                                );
                              } else if (e.key === "Escape") {
                                setIsEditing(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) =>
                              handleEditChat(
                                chat.conversation_id,
                                e.currentTarget.value,
                              )
                            }
                            className="bg-[#35363a] text-[#e0e0e0] rounded-lg px-3 py-1.5 w-full text-sm border border-[#45464a] focus:outline-none focus:border-[#8A92E3] transition-colors"
                          />
                        ) : (
                          <div className="truncate text-sm text-[#d0d0d0] font-medium group-hover:text-[#e0e0e0] transition-colors">
                            {chat.title}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) =>
                            toggleFavorite(chat.conversation_id, e)
                          }
                          className={`p-1.5 rounded-lg hover:bg-muted transition-all duration-150 ${
                            favorites.includes(chat.conversation_id)
                              ? "text-yellow-400"
                              : "text-[#b0b0b0] hover:text-[#d0d0d0]"
                          }`}
                          title={
                            favorites.includes(chat.conversation_id)
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                        >
                          {favorites.includes(chat.conversation_id) ? (
                            <Star size={14} />
                          ) : (
                            <StarOff size={14} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsEditing(chat.conversation_id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-[#b0b0b0] hover:text-[#d0d0d0] transition-all duration-150"
                          title="Edit chat title"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) =>
                            handleDeleteChat(chat.conversation_id, e)
                          }
                          className="p-1.5 rounded-lg hover:bg-muted text-[#b0b0b0] hover:text-[#d0d0d0] transition-all duration-150"
                          title="Delete chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Link>
                  </div>
                ))}

              {filteredConversations && filteredConversations.length > 5 && (
                <div
                  className="flex items-center px-3 py-2 mt-2 text-sm text-[#CACACA] hover:bg-[#303134] cursor-pointer rounded-lg transition-colors"
                  onClick={() => setShowMore(!showMore)}
                >
                  <ChevronDown
                    size={18}
                    className={`mr-2 transform transition-transform ${
                      showMore ? "rotate-180" : ""
                    }`}
                  />
                  {showMore
                    ? "Show less"
                    : `Show ${filteredConversations.length - 5} more`}
                </div>
              )}
            </>
          )}
        </div>
      </>

      <div
        className={`mt-auto border-t border-[#2c2d31]/50 pt-2 transition-all duration-300 ${collapsed ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"}`}
      >
        <div className="py-2">
          <>
            <div
              className={`flex flex-col items-center gap-2 mt-2 ${collapsed ? "" : "hidden"}`}
            >
              <div className="flex items-center justify-center w-10 h-10 hover:bg-muted/50 cursor-pointer rounded-lg relative">
                <HelpCircle size={18} className="text-[#CACACA]" />
                <div className="h-2 w-2 bg-red-500 rounded-full absolute top-1 right-1"></div>
              </div>

              <div className="flex items-center justify-center w-10 h-10 hover:bg-muted/50 cursor-pointer rounded-lg">
                <Settings size={18} className="text-[#CACACA]" />
              </div>
            </div>

            <div
              className={`flex items-center px-4 py-2 hover:bg-muted/50 cursor-pointer rounded-lg mx-2 relative ${collapsed ? "hidden" : ""}`}
            >
              <HelpCircle size={18} className="text-[#CACACA] mr-3" />
              <span className="text-sm">Help & Resources</span>
              <div className="h-2 w-2 bg-red-500 rounded-full absolute right-4"></div>
            </div>

            <div
              className={`flex items-center px-4 py-2 hover:bg-muted/50 cursor-pointer rounded-lg mx-2 ${collapsed ? "hidden" : ""}`}
            >
              <Settings size={18} className="text-[#CACACA] mr-3" />
              <span className="text-sm">Settings</span>
            </div>
          </>
        </div>
        {!collapsed && (
          <div className="px-5 py-3 text-xs text-[#CACACA]/80 bg-card/40 rounded-lg mx-2 mb-2">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span>Designed & developed by Harsh</span>
            </div>
            <div className="mt-1 text-[10px] text-[#CACACA]/60">
              v2.3.4 • Last updated: Today
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvSidebar;

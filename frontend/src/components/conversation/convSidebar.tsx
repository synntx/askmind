"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  HelpCircle,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useParams } from "next/navigation";
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
      </div>
    </div>
  );
};

const ConvSidebar = () => {
  const { space_id }: { space_id: string } = useParams();
  const { data, error, isError, isPending, refetch } =
    useGetConversations(space_id);

  const [collapsed, setCollapsed] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const chatListRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`h-screen bg-[#202124] flex flex-col ${
        collapsed ? "w-16" : "w-80"
      } text-gray-300 overflow-hidden transition-all duration-300`}
    >
      <div className="flex items-center justify-between p-3 mx-2 my-2 mb-6">
        {!collapsed && (
          <div className="flex">
            <h2 className="text-2xl font-semibold tracking-tight">Ask</h2>
            <h2 className="text-2xl font-semibold tracking-tight text-[#8A92E3]">
              Mind
            </h2>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 -ml-1.5 rounded-full hover:bg-[#303134]"
        >
          {collapsed ? (
            <ChevronsRight size={20} className="text-[#CACACA]" />
          ) : (
            <ChevronsLeft size={20} className="text-[#CACACA]" />
          )}
        </button>
      </div>

      <div className={`${collapsed ? "px-2" : "px-4"} pb-5`}>
        <button
          className={`w-full md:max-w-32 flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          } hover:bg-[#303134] text-gray-300 py-3 ${
            collapsed ? "px-2" : "px-4"
          } rounded-full transition-all duration-150 active:scale-[0.95] ease-in-out`}
        >
          <Plus size={18} />
          {!collapsed && <span className="font-medium text-sm">New chat</span>}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="px-4 pb-2">
            <h3 className="text-sm font-medium text-[#CACACA]">Recent</h3>
          </div>

          <div
            ref={chatListRef}
            className="flex-1 overflow-y-auto px-4 pt-2 pb-4 custom-scrollbar"
          >
            {isPending ? (
              <LoadingState />
            ) : isError ? (
              <ErrorState
                message={error?.message || "Something went wrong"}
                onRetry={() => refetch()}
              />
            ) : !data || data.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {data?.map((chat) => (
                  <Link
                    href={`/space/${space_id}/c/${chat.conversation_id}`}
                    key={chat.conversation_id}
                    className={`group flex items-center justify-between my-1.5 px-2.5 py-1.5 hover:bg-[#2c2d31] cursor-pointer rounded-xl ${
                      selectedChat === chat.conversation_id
                        ? "bg-[#2c2d31]"
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
                              // handleEdit(chat.conversation_id, e.currentTarget.value);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => setIsEditing(null)} 
                          className="bg-[#35363a] text-[#e0e0e0] rounded-lg px-3 py-1.5 w-full text-sm border border-[#45464a] focus:outline-none focus:border-[#5e5f64] transition-colors"
                        />
                      ) : (
                        <div className="truncate text-sm text-[#d0d0d0] font-medium group-hover:text-[#e0e0e0] transition-colors">
                          {chat.title}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditing(chat.conversation_id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#3a3b3f] text-[#b0b0b0] hover:text-[#d0d0d0] transition-all duration-150"
                        title="Edit chat title"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // deleteChat(chat.conversation_id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#3a3b3f] text-[#b0b0b0] hover:text-[#d0d0d0] transition-all duration-150"
                        title="Delete chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Link>
                ))}

                {data && data.length > 5 && (
                  <div
                    className="flex items-center px-3 py-2 text-sm text-[#CACACA] hover:bg-[#303134] cursor-pointer rounded-lg mx-2"
                    onClick={() => setShowMore(!showMore)}
                  >
                    <ChevronDown
                      size={18}
                      className={`mr-2 transform transition-transform ${
                        showMore ? "rotate-180" : ""
                      }`}
                    />
                    {showMore ? "Less" : "More"}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <div className="mt-auto border-t border-gray-800 pt-2">
        <div className="py-2">
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "px-4"
            } py-2 hover:bg-[#303134] cursor-pointer rounded-lg mx-2 relative`}
          >
            <HelpCircle
              size={18}
              className={`text-[#CACACA] ${collapsed ? "" : "mr-3"}`}
            />
            {!collapsed && <span className="text-sm">Help</span>}
            <div
              className={`h-2 w-2 bg-red-500 rounded-full ${
                collapsed ? "absolute top-0 right-0" : "absolute right-4"
              }`}
            ></div>
          </div>
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "px-4"
            } py-2 hover:bg-[#303134] cursor-pointer rounded-lg mx-2`}
          >
            <Settings
              size={18}
              className={`text-[#CACACA] ${collapsed ? "" : "mr-3"}`}
            />
            {!collapsed && <span className="text-sm">Settings</span>}
          </div>
        </div>

        {!collapsed && (
          <div className="px-5 py-3 text-xs text-[#CACACA]/80">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              <span>Designed & developed by Harsh</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvSidebar;

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
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useGetConversations } from "@/hooks/useConversation";

const ErrorState = ({ message }: any) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <AlertCircle size={36} className="text-red-400 mb-3" />
      <h3 className="text-lg font-medium mb-2">Unable to load conversations</h3>
      <p className="text-[#CACACA] text-sm mb-4">{message}</p>
      <button className="px-4 py-2 bg-red-500/5 text-red-500 rounded-lg text-sm hover:bg-red-500/10 transition-colors">
        Try Again
      </button>
    </div>
  );
};

const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="bg-[#303134] p-4 rounded-full mb-4">
        <MessageSquare size={32} className="text-[#8A92E3]" />
      </div>
      <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
      <p className="text-[#CACACA]/50 text-sm mb-5">
        Start a new chat to begin asking questions
      </p>
      {/*<button className="px-5 py-2.5 bg-[#8A92E3]/5 text-[#8A92E3] rounded-full text-sm hover:bg-[#8A92E3]/10 transition-colors flex items-center gap-2 active:bg-[#8A92E3]/15 duration-150">
        <Plus size={16} />
        New conversation
      </button> */}
    </div>
  );
};

const ConvSidebar = () => {
  const { space_id }: { space_id: string } = useParams();

  const { data, error, isError, isPending } = useGetConversations(space_id);

  const [collapsed, setCollapsed] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Reference to the chat list container
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
          // onClick={handleNewChat}
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
        <div className="px-4 pb-2">
          <h3 className="text-sm font-medium text-[#CACACA]">Recent</h3>
        </div>
      )}

      <div
        ref={chatListRef}
        className="flex-1 overflow-y-auto px-4 pt-2 pb-4 custom-scrollbar"
      >
        {!collapsed && isPending ? (
          <p className="text-center py-12 text-sm text-[#CACACA]">
            {"Loading Conversations..."}
          </p>
        ) : !collapsed && isError ? (
          <ErrorState message={error?.message || "Something went wrong"} />
        ) : !collapsed && (!data || data.length === 0) ? (
          <EmptyState />
        ) : (
          data?.map((chat) => (
            <div
              key={chat.conversationId}
              className={`group flex items-center my-1 px-3 py-2 hover:bg-[#303134] cursor-pointer rounded-lg ${
                selectedChat === chat.conversationId ? "bg-[#303134]" : ""
              }`}
              onClick={() => setSelectedChat(chat.conversationId)}
            >
              <div className="flex-1 min-w-0">
                {isEditing === chat.conversationId ? (
                  <input
                    type="text"
                    defaultValue={chat.title}
                    autoFocus
                    // onBlur={(e) => handleEdit(chat.conversationId, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // handleEdit(chat.conversationId, e.currentTarget.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#3c3c3f] text-[#CACACA] rounded px-2 py-1 w-full text-sm"
                  />
                ) : (
                  <div className="truncate text-sm">{chat.title}</div>
                )}
              </div>

              <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(chat.conversationId);
                  }}
                  className="p-1 rounded-full hover:bg-[#3c3c3f] text-[#CACACA]"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // deleteChat(chat.conversationId);
                  }}
                  className="p-1 rounded-full hover:bg-[#3c3c3f] text-[#CACACA]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}

        {!collapsed && data && data.length > 5 && (
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
      </div>

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

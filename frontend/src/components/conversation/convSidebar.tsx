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

interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  date?: string;
}

const ConvSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "Sidebar Component Implementation",
      date: "Today",
    },
    {
      id: "2",
      title: "Password Anxiety and Digital Security",
      date: "Yesterday",
    },
    {
      id: "3",
      title: "Unique Image Creation",
      date: "Last Week",
    },
    {
      id: "4",
      title: "Cozy Reading Nook Concept",
      date: "Last Week",
    },
    {
      id: "5",
      title: "Improving Space List UI",
      date: "Last Week",
    },
    {
      id: "6",
      title: "Research on Animation Techniques",
      date: "Last Month",
    },
    {
      id: "7",
      title: "Customer Feedback Analysis",
      date: "Last Month",
    },
    {
      id: "8",
      title: "Mobile Responsiveness Testing",
      date: "Last Month",
    },
    {
      id: "9",
      title: "Design System Documentation",
      date: "2 Months Ago",
    },
    {
      id: "10",
      title: "User Interview Notes",
      date: "2 Months Ago",
    },
  ]);

  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  
  // Reference to the chat list container
  const chatListRef = useRef<HTMLDivElement>(null);

  const handleNewChat = () => {
    const newChat = {
      id: crypto.randomUUID(),
      title: "New chat",
      date: "Just now",
    };
    setChats([newChat, ...chats]);
    setSelectedChat(newChat.id);
  };

  const deleteChat = (chatId: string) => {
    setChats(chats.filter((chat) => chat.id !== chatId));
    if (selectedChat === chatId) {
      setSelectedChat(null);
    }
  };

  const handleEdit = (chatId: string, newTitle: string) => {
    setChats(
      chats.map((chat) =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat,
      ),
    );
    setIsEditing(null);
  };

  const filteredChats = chats.filter((_) => {
    return true;
  });

  // Display all chats if showMore is true, otherwise only top 5
  const displayChats = showMore ? filteredChats : filteredChats.slice(0, 5);

  return (
    <div className={`h-screen bg-[#202124] flex flex-col ${collapsed ? 'w-16' : 'w-80'} text-gray-300 overflow-hidden transition-all duration-300`}>
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
          {collapsed ? 
            <ChevronsRight size={20} className="text-[#CACACA]" /> : 
            <ChevronsLeft size={20} className="text-[#CACACA]" />
          }
        </button>
      </div>

      <div className={`${collapsed ? 'px-2' : 'px-4'} pb-5`}>
        <button
          onClick={handleNewChat}
          className={`w-full md:max-w-32 flex items-center ${collapsed ? 'justify-center' : 'gap-2'} hover:bg-[#303134] text-gray-300 py-3 ${collapsed ? 'px-2' : 'px-4'} rounded-full transition-all duration-150 active:scale-[0.95] ease-in-out`}
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
        {!collapsed && displayChats.map((chat) => (
          <div
            key={chat.id}
            className={`group flex items-center my-1 px-3 py-2 hover:bg-[#303134] cursor-pointer rounded-lg ${
              selectedChat === chat.id ? "bg-[#303134]" : ""
            }`}
            onClick={() => setSelectedChat(chat.id)}
          >

            <div className="flex-1 min-w-0">
              {isEditing === chat.id ? (
                <input
                  type="text"
                  defaultValue={chat.title}
                  autoFocus
                  onBlur={(e) => handleEdit(chat.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEdit(chat.id, e.currentTarget.value);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#3c3c3f] text-[#CACACA] rounded px-2 py-1 w-full text-sm"
                />
              ) : (
                <div className="truncate text-sm">
                  {chat.title}
                </div>
              )}
            </div>

            <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(chat.id);
                }}
                className="p-1 rounded-full hover:bg-[#3c3c3f]  text-[#CACACA]"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="p-1 rounded-full hover:bg-[#3c3c3f] text-[#CACACA]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {!collapsed && filteredChats.length > 5 && (
          <div 
            className="flex items-center px-3 py-2 text-sm text-[#CACACA] hover:bg-[#303134] cursor-pointer rounded-lg mx-2"
            onClick={() => setShowMore(!showMore)}
          >
            <ChevronDown size={18} className={`mr-2 transform transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Less' : 'More'}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-gray-800 pt-2">
        <div className="py-2">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-2 hover:bg-[#303134] cursor-pointer rounded-lg mx-2 relative`}>
            <HelpCircle size={18} className={`text-[#CACACA] ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && <span className="text-sm">Help</span>}
            <div className={`h-2 w-2 bg-red-500 rounded-full ${collapsed ? 'absolute top-0 right-0' : 'absolute right-4'}`}></div>
          </div>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-4'} py-2 hover:bg-[#303134] cursor-pointer rounded-lg mx-2`}>
            <Settings size={18} className={`text-[#CACACA] ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && <span className="text-sm">Settings</span>}
          </div>
        </div>

        {!collapsed && (
          <div className="px-5 py-3  text-xs text-[#CACACA]/80">
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

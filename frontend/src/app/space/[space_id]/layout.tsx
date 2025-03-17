"use client";

import ConvSidebar from "@/components/conversation/convSidebar";
import { PanelLeft } from "lucide-react";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="
            fixed z-50 flex items-center justify-center
            left-4 top-4 w-9 h-9 rounded-md hover:bg-muted
            text-white/80 hover:text-white/90 transition-all duration-150
          "
          aria-label="Expand sidebar"
        >
          <PanelLeft size={18} />
        </button>
      )}
      <div
        className={`
          ${isMobile ? "fixed" : "relative"}
          z-40 h-full bg-[#1c1d20]
          ${collapsed ? (isMobile ? "-translate-x-full" : "w-0 opacity-0") : "translate-x-0 w-[320px]"}
          transition-all duration-300 ease-in-out overflow-hidden
        `}
      >
        <ConvSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      {!collapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default Layout;

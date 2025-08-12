"use client";

import React, { useState, useEffect, startTransition } from "react";
import ConvSidebar from "@/components/conversation/convSidebar";
import MenuIcon from "@/icons";

interface LayoutProps {
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 50;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsedByClick, setCollapsedByClick] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Track touch start position
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Derive sidebar open state
  useEffect(() => {
    setIsSidebarOpen(!collapsedByClick || (!isMobile && isHovering));
  }, [collapsedByClick, isMobile, isHovering]);

  const toggleCollapsedClick = () => {
    startTransition(() => {
      setCollapsedByClick((prev) => {
        if (prev) setIsHovering(false);
        return !prev;
      });
    });
  };

  // Touch event handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX;
    // Swipe right to open
    if (diffX > SWIPE_THRESHOLD && collapsedByClick) {
      toggleCollapsedClick();
    }
    // Swipe left to close
    else if (diffX < -SWIPE_THRESHOLD && !collapsedByClick) {
      toggleCollapsedClick();
    }
    setTouchStartX(null);
  };

  const showToggleButton = collapsedByClick && isMobile;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex h-screen overflow-hidden bg-background"
    >
      {showToggleButton && (
        <button
          onClick={toggleCollapsedClick}
          className="fixed z-50 left-4 top-4 active:scale-[0.95] transition-all duration-150 ease-in-out"
          aria-label="Expand sidebar"
        >
          <MenuIcon />
        </button>
      )}

      <div
        className={`
          ${isMobile ? "fixed z-40 h-full" : "relative h-full"}
          transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0
          ${isSidebarOpen ? "translate-x-0 w-80" : isMobile ? "-translate-x-full w-80" : "translate-x-0 w-[60px]"}
        `}
        onMouseEnter={
          !isMobile && collapsedByClick ? () => setIsHovering(true) : undefined
        }
        onMouseLeave={
          !isMobile && collapsedByClick ? () => setIsHovering(false) : undefined
        }
        role="region"
        aria-label="Conversation sidebar"
      >
        <ConvSidebar
          collapsed={!isSidebarOpen}
          setCollapsed={toggleCollapsedClick}
        />
      </div>

      <main className="flex-1 overflow-hidden">
        <div className="md:px-3 lg:px-6 w-full">{children}</div>
      </main>
    </div>
  );
};

export default Layout;

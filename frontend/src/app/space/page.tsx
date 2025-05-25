"use client";

import Header from "@/components/common/header";
import SpaceError from "@/components/errors/spaceError";
import CreateSpaceModal from "@/components/space/createSpaceModal";
import SpaceCard from "@/components/space/spaceCard";
import SpaceListItem from "@/components/space/spaceListItem";
import { useCreateSpace, useGetSpaces } from "@/hooks/useSpace";
import { useState, useEffect } from "react";
import { List, Grid } from "@/icons";
import { AxiosError } from "axios";
import { Plus, Settings } from "lucide-react";
import { AppError } from "@/types/errors";
import { motion, AnimatePresence } from "motion/react";
import { SettingsModal } from "@/components/settings/SettingsModal";

export default function SpacesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<string>("");

  const { data: spaces, error, isPending, isError } = useGetSpaces();
  const { mutate: CreateSpace } = useCreateSpace();

  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  const applyTheme = (themeClass: string) => {
    const html = document.documentElement;
    html.classList.remove(
      "dark",
      "theme-a",
      "theme-a-dark",
      "theme-b",
      "theme-b-dark",
      "theme-c",
      "theme-c-dark",
      "theme-d",
      "theme-d-dark",
    );
    if (themeClass) {
      html.classList.add(themeClass);
    }
  };

  const handleThemeChange = (themeClass: string) => {
    setCurrentTheme(themeClass);
    applyTheme(themeClass);
    localStorage.setItem("app-theme", themeClass);
  };

  // Effect to read theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Optional: Apply a default theme if none is saved
      // applyTheme(""); // Or a specific default class
      // setCurrentTheme(""); // Or the default class
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 mt-14 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            <h2 className="text-3xl">My Spaces</h2>
            {spaces && spaces.length > 0 && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-transparent hover:bg-card text-card-foreground px-3 py-1.5 rounded-md transition-all duration-150 active:scale-[0.97]"
                aria-label="Create new space"
              >
                <Plus className="w-4 h-4" />
                <span>Create Space</span>
              </button>
            )}
          </div>
          <button
            onClick={openSettingsModal}
            className="p-2 rounded-md hover:bg-muted/60 text-muted-foreground flex-shrink-0 transition-colors"
            aria-label="Open Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <div className="flex items-center p-0.5 rounded-lg bg-secondary/20">
            <button
              onClick={() => setViewMode("grid")}
              className={`
                p-1.5 rounded-md transition-all duration-100 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-[#8A92E3]/50
                ${
                  viewMode === "grid"
                    ? "bg-secondary/50 shadow-sm"
                    : "hover:bg-secondary/30 active:bg-secondary/40"
                }
              `}
              aria-label="Grid View"
              aria-pressed={viewMode === "grid"}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>

            <button
              onClick={() => setViewMode("list")}
              className={`
                p-1.5 rounded-md ml-1 transition-all duration-100 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-[#8A92E3]/50
                ${
                  viewMode === "list"
                    ? "bg-secondary/50 shadow-sm"
                    : "hover:bg-secondary/30 active:bg-secondary/40"
                }
              `}
              aria-label="List View"
              aria-pressed={viewMode === "list"}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* States handling in order: Loading -> Error -> No Spaces -> Content */}
        {isPending ? (
          <div className="flex flex-col items-center justify-center py-12">
            <h3 className="text-2xl font-semibold mb-4">Loading Spaces...</h3>
            <p className="text-gray-400">
              Please wait while we fetch your spaces.
            </p>
          </div>
        ) : isError ? (
          <SpaceError err={error as AxiosError<AppError>} />
        ) : !spaces || spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <h3 className="text-2xl font-semibold mb-4">No Spaces Found</h3>
            <p className="text-gray-400 mb-6">
              Looks like you haven not created any spaces yet.
            </p>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-[hsl(234,10%,14%)] hover:bg-[hsl(234,10%,18%)] px-4 py-2 rounded-lg transition-all duration-150 text-white active:scale-[0.97]"
            >
              <Plus className="w-5 h-5" />
              Create Space
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === "grid" ? (
              <motion.div
                key="grid-view"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {spaces.map((space, index) => (
                  <SpaceCard space={space} key={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list-view"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="grid grid-cols-1"
              >
                {spaces.map((space, index) => (
                  <SpaceListItem space={space} key={index} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
      <CreateSpaceModal
        isOpen={isCreateModalOpen}
        onSubmit={(data) => CreateSpace(data)}
        onClose={closeCreateModal}
      />

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={closeSettingsModal}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
        />
      )}
    </div>
  );
}

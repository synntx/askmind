"use client";

import Header from "@/components/common/header";
import SpaceCard from "@/components/space/spaceCard";
import SpaceListItem from "@/components/space/spaceListItem";
import { useToast } from "@/components/ui/toast";
import { useGetSpaces } from "@/hooks/useSpace";
import { List, Grid } from "@/icons";
import { AxiosError } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function SpacesPage() {
  const { addToast } = useToast();
  const { data: spaces, error, isPending, isError } = useGetSpaces();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (isPending) return <div>Loading...</div>;
  if (isError) {
    const err = error as AxiosError<ApiError>;
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-lg font-semibold text-red-700">Error</h3>
        <p className="text-red-600">
          {err.response?.data?.message || err.message || "An error occurred"}
        </p>
        <p className="mt-2 text-sm text-red-500">
          Code: {err.response?.data.code}
        </p>
      </div>
    );
  }
  if (!spaces) return <div>No Space Found</div>;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 mt-14">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            <h2 className="text-3xl">My Spaces</h2>
            {spaces.length > 0 && (
              <button
                onClick={() => addToast("Registration successful!", "success")}
                className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/50 border border-[#282828] transition-all duration-150 px-4 py-1.5 rounded-lg active:scale-[0.95] ease-in-out"
              >
                <Plus className="w-5 h-5 text-[#B0B0B0]" />
                Create Space
              </button>
            )}
          </div>
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

        {spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <h3 className="text-2xl font-semibold mb-4">No Spaces Found</h3>
            <p className="text-gray-400 mb-6">
              Looks like you haven't created any spaces yet.
            </p>
            <button className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#1A1A1A]/50 border border-[#282828] transition-all duration-150 px-4 py-1.5 rounded-lg active:scale-[0.95] ease-in-out">
              <Plus className="w-5 h-5 text-[#B0B0B0]" />
              Create Space
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {spaces.map((space, index) => (
              <SpaceCard space={space} key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {spaces.map((space, index) => (
              <SpaceListItem space={space} key={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

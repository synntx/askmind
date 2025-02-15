"use client";

import { useToast } from "@/components/ui/toast";
import { EditLight, Ellipse, TrashLight, List, Grid } from "@/icons/icons";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function SpacesPage() {
  const { addToast } = useToast();

  const spaces = [
    {
      id: 1,
      title: "Data Science Lab",
      description:
        "A hub for data enthusiasts to explore machine learning, big data, and predictive analytics.",
      createdAt: "3 days ago",
      sources: 5,
    },
    {
      id: 2,
      title: "Machine Learning Hub",
      description:
        "Discuss cutting-edge ML models, from neural networks to decision trees.",
      createdAt: "1 week ago",
      sources: 8,
    },
    {
      id: 3,
      title: "Frontend Frenzy",
      description:
        "Where modern web design meets React, Vue, and Angular magic.",
      createdAt: "5 hours ago",
      sources: 3,
    },
    {
      id: 4,
      title: "Quantum Computing",
      description:
        "Dive into the mysteries of quantum bits and advanced algorithms.",
      createdAt: "2 days ago",
      sources: 4,
    },
    {
      id: 5,
      title: "UI/UX Inspiration",
      description:
        "A space dedicated to the art of design and seamless user experiences.",
      createdAt: "6 days ago",
      sources: 7,
    },
  ];

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="min-h-screen">
      <header>
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex mb-3 animate-reveal">
              <h2 className="text-3xl tracking-tight">Ask</h2>
              <h2 className="text-3xl tracking-tight text-[#8A92E3]">Mind</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <img
              src="https://media2.dev.to/dynamic/image/width=800%2Cheight=%2Cfit=scale-down%2Cgravity=auto%2Cformat=auto/https%3A%2F%2Fwww.gravatar.com%2Favatar%2F2c7d99fe281ecd3bcd65ab915bac6dd5%3Fs%3D250"
              alt="Avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          </div>
        </div>
      </header>

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
              <div
                key={index}
                className="bg-[#1A1A1A] rounded-lg p-6 hover:bg-[#2232323] border border-transparent hover:border-[#282828] transition cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg mb-2">{space.title}</h3>
                    <p className="text-gray-400 text-sm">{space.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-4">
                    <span>created {space.createdAt}</span>
                    <Ellipse className="h-2 w-2" />
                    <span>{space.sources} sources</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out">
                      <TrashLight className="h-5 w-5" />
                    </button>
                    <button className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out">
                      <EditLight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {spaces.map((space, index) => (
              <div
                key={index}
                className="bg-[#1A1A1A] rounded-lg p-4 hover:bg-[#2232323] border border-transparent hover:border-[#282828] transition cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center">
                  <h3 className="w-60">{space.title}</h3>

                  <div className="flex items-center flex-row gap-12">
                    <p className="w-40 hidden md:block truncate text-gray-400 text-sm">
                      {space.description}
                    </p>
                    <div className="hidden md:flex items-center text-sm text-gray-400">
                      <span>created {space.createdAt}</span>
                      <Ellipse className="h-1.5 w-1.5 mx-2" />
                      <span>{space.sources} sources</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out">
                    <TrashLight className="h-5 w-5" />
                  </button>
                  <button className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out">
                    <EditLight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

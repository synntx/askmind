import { EditLight, Ellipse, TrashLight } from "@/icons";
import React from "react";

type SpaceCardProps = {
  space: any;
};

const SpaceCard = ({ space }: SpaceCardProps) => {
  return (
    <div
      key={space.space_id}
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
  );
};

export default SpaceCard;

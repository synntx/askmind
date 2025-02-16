import { TrashLight, EditLight, Ellipse } from "@/icons";
import React from "react";

type SpaceListItemProps = {
  space: any;
};

const SpaceListItem = ({ space }: SpaceListItemProps) => {
  return (
    <div
      key={space.space_id}
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
  );
};

export default SpaceListItem;

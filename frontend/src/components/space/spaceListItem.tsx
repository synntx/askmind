import React, { useState } from "react";
import { getTimeAgo } from "@/lib/utils";
import { Space } from "@/types/space";
import { TrashLight, EditLight, Ellipse } from "@/icons";
import EditSpaceModal from "./editSpaceModal";
import DeleteSpaceModal from "./deleteSpaceModal";
import { useRouter } from "next/navigation";

type SpaceListItemProps = {
  space: Space;
};

const SpaceListItem = ({ space }: SpaceListItemProps) => {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const handleItemClick = () => {
    router.push(`/space/${space.space_id}/c/new`);
  };

  return (
    <>
      <div
        key={space.space_id}
        className="bg-[#1A1A1A] rounded-lg p-4 hover:bg-[#2232323] border border-transparent hover:border-[#282828] transition cursor-pointer group flex items-center justify-between"
        onClick={handleItemClick}
      >
        <div className="flex items-center">
          <h3 className="w-60">{space.title}</h3>
          <div className="flex items-center flex-row gap-12">
            <p className="w-40 hidden md:block truncate text-gray-400 text-sm">
              {space.description}
            </p>
            <div className="hidden md:flex items-center text-sm text-gray-400">
              <span>created {getTimeAgo(space.created_at)}</span>
              <Ellipse className="h-1.5 w-1.5 mx-2" />
              <span>{space.source_limit} sources</span>
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking buttons
        >
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out"
          >
            <TrashLight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out"
          >
            <EditLight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <EditSpaceModal
        handleClose={() => setIsEditModalOpen(false)}
        isOpen={isEditModalOpen}
        space={space}
      />
      <DeleteSpaceModal
        space={space}
        isOpen={isDeleteModalOpen}
        handleClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};

export default SpaceListItem;

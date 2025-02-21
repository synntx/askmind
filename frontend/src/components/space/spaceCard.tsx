import { EditLight, Ellipse, TrashLight } from "@/icons";
import { getTimeAgo } from "@/lib/utils";
import { Space } from "@/types/space";
import React, { useState } from "react";
import EditSpaceModal from "./editSpaceModal";
import DeleteSpaceModal from "./deleteSpaceModal";
import Link from "next/link";

type SpaceCardProps = {
  space: Space;
};

const SpaceCard = ({ space }: SpaceCardProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  return (
    <Link href={""}>
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
            <span>created {getTimeAgo(space.created_at)}</span>
            <Ellipse className="h-2 w-2" />
            <span>{space.source_limit} sources</span>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
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
    </Link>
  );
};

export default SpaceCard;

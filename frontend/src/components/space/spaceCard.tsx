import { EditLight, Ellipse, TrashLight } from "@/icons";
import { getTimeAgo } from "@/lib/utils";
import { Space } from "@/types/space";
import React, { useState, useRef, useEffect } from "react";
import DeleteSpaceModal from "./deleteSpaceModal";
import Link from "next/link";
import { useUpdateSpace } from "@/hooks/useSpace";
import { CheckIcon, X } from "lucide-react";

type SpaceCardProps = {
  space: Space;
};

const SpaceCard = ({ space }: SpaceCardProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    Title: space.title,
    Description: space.description,
  });

  const titleInputRef = useRef<HTMLInputElement>(null);
  const { mutate: updateSpace, isPending } = useUpdateSpace(space.space_id);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setFormData({
      Title: space.title,
      Description: space.description,
    });
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
  };

  const saveChanges = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateSpace(formData, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  return (
    <div key={space.space_id}>
      {isEditing ? (
        <div className="bg-[hsl(234,10%,12%)] rounded-lg p-6 border border-[#282828] transition shadow-sm">
          <div className="mb-4">
            <input
              ref={titleInputRef}
              type="text"
              name="Title"
              value={formData.Title}
              onChange={handleChange}
              className="w-full border border-[#20242f] bg-[#1c1d27] rounded-md p-3
                focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
                transition-all placeholder-[#767676] hover:border-[#3A3F4F] mb-2"
              placeholder="Space name"
              required
            />
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              rows={1}
              className="w-full border border-[#20242f] bg-[#1c1d27] rounded-md p-3
                focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
                transition-all placeholder-[#767676] hover:border-[#3A3F4F]"
              placeholder="Space description"
            />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-4">
              <span>created {getTimeAgo(space.created_at)}</span>
              <Ellipse className="h-2 w-2" />
              <span>{space.source_limit} sources</span>
            </div>
            <div className="flex items-center gap-2">
              {isPending ? (
                <span className="text-sm text-gray-400">Saving...</span>
              ) : (
                <>
                  <button
                    onClick={cancelEditing}
                    className="p-1.5 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={saveChanges}
                    className="p-1.5 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out text-[#8A92E3]"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Link href={`/space/${space.space_id}/c/new`} className="block">
          <div className="bg-[hsl(234,10%,12%)] rounded-lg p-6 border border-transparent hover:border-[#282828] transition cursor-pointer group">
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
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out"
                >
                  <TrashLight className="h-5 w-5" />
                </button>
                <button
                  onClick={startEditing}
                  className="p-1 hover:bg-secondary rounded-md active:scale-[0.95] transition-all duration-150 ease-in-out"
                >
                  <EditLight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </Link>
      )}

      <DeleteSpaceModal
        space={space}
        isOpen={isDeleteModalOpen}
        handleClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default SpaceCard;

import React, { useState, useRef, useEffect } from "react";
import { getTimeAgo } from "@/lib/utils";
import { Space } from "@/types/space";
import { TrashLight, EditLight, Ellipse } from "@/icons";
import DeleteSpaceModal from "./deleteSpaceModal";
import { useRouter } from "next/navigation";
import { useUpdateSpace } from "@/hooks/useSpace";
import { CheckIcon, X } from "lucide-react";

type SpaceListItemProps = {
  space: Space;
};

const SpaceListItem = ({ space }: SpaceListItemProps) => {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
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

  const handleItemClick = () => {
    if (!isEditing) {
      router.push(`/space/${space.space_id}/c/new`);
    }
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
    <>
      <div
        key={space.space_id}
        className={`p-4 py-6 ${isEditing ? "bg-secondary/20" : "hover:bg-secondary/20"} border-b transition cursor-pointer group flex items-center justify-between`}
        onClick={handleItemClick}
      >
        {isEditing ? (
          <>
            <div className="flex items-center flex-1 gap-4">
              <input
                ref={titleInputRef}
                type="text"
                name="Title"
                value={formData.Title}
                onChange={handleChange}
                className="w-60 border border-[#20242f] bg-[#1c1d27] rounded-md p-3
                  focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
                  transition-all placeholder-[#767676] hover:border-[#3A3F4F]"
                placeholder="Space name"
                onClick={(e) => e.stopPropagation()}
                required
              />
              <div className="flex items-center flex-row gap-12 flex-1">
                <input
                  type="text"
                  name="Description"
                  value={formData.Description}
                  onChange={handleChange}
                  className="w-40 hidden md:block border border-[#20242f] bg-[#1c1d27] rounded-md p-3
                    focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
                    transition-all placeholder-[#767676] hover:border-[#3A3F4F]"
                  placeholder="Description"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="hidden md:flex items-center text-sm text-gray-400">
                  <span>created {getTimeAgo(space.created_at)}</span>
                  <Ellipse className="h-1.5 w-1.5 mx-2" />
                  <span>{space.source_limit} sources</span>
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
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
          </>
        ) : (
          <>
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
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsDeleteModalOpen(true)}
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
          </>
        )}
      </div>

      <DeleteSpaceModal
        space={space}
        isOpen={isDeleteModalOpen}
        handleClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};

export default SpaceListItem;

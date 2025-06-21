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
    // Reset formData to original space data if cancel
    setFormData({
      Title: space.title,
      Description: space.description,
    });
  };

  const saveChanges = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFormValid) {
      updateSpace(formData, {
        onSuccess: () => {
          setIsEditing(false);
        },
      });
    }
  };

  const isFormValid =
    formData.Title.trim().length > 0 && formData.Description.trim().length > 0;

  return (
    <>
      <div
        key={space.space_id}
        className={`p-4 py-6 ${isEditing ? "bg-secondary/20" : "hover:bg-secondary/20"} border-b transition cursor-pointer group flex ${isEditing ? "flex-col items-start" : "items-center justify-between"}`}
        onClick={handleItemClick}
      >
        {isEditing ? (
          <div className="flex flex-col w-full gap-4">
            <div className="space-y-2">
              <label
                htmlFor="edit-space-list-title"
                className="flex items-center gap-2 text-sm font-medium text-foreground"
              >
                Space Name
              </label>
              <div className="relative">
                <input
                  ref={titleInputRef}
                  type="text"
                  id="edit-space-list-title"
                  name="Title"
                  value={formData.Title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
                  placeholder="e.g., My Project Workspace"
                  required
                  disabled={isPending}
                  maxLength={50}
                />
                <div className="absolute right-3 top-3 text-xs text-muted-foreground">
                  {formData.Title.length}/50
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="edit-space-list-description"
                className="flex items-center gap-2 text-sm font-medium text-foreground"
              >
                Description
              </label>
              <div className="relative">
                <textarea
                  id="edit-space-list-description"
                  name="Description"
                  value={formData.Description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-muted/30 outline-none border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200 resize-none"
                  placeholder="Describe what this space will be used for..."
                  required
                  disabled={isPending}
                  maxLength={200}
                />
                <div className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                  {formData.Description.length}/200
                </div>
              </div>
            </div>

            {!isFormValid &&
              (formData.Title.length > 0 ||
                formData.Description.length > 0) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-full">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Please fill in both the space name and description to
                    continue.
                  </p>
                </div>
              )}

            <div className="flex items-center justify-between text-sm text-muted-foreground w-full pt-2">
              <div className="flex items-center gap-4">
                <span>created {getTimeAgo(space.created_at)}</span>
                <Ellipse className="h-2 w-2 text-muted-foreground" />
                <span>{space.source_limit} sources</span>
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {isPending ? (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  <>
                    <button
                      onClick={cancelEditing}
                      disabled={isPending}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={!isFormValid || isPending}
                      className="p-2 rounded-xl text-primary hover:bg-primary/20 hover:text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <CheckIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center flex-1">
              <h3 className="min-w-[150px] max-w-[240px] truncate text-foreground">
                {space.title}
              </h3>
              <div className="flex items-center flex-row gap-12 ml-4">
                <p className="w-40 hidden md:block truncate text-muted-foreground text-sm">
                  {space.description}
                </p>
                <div className="hidden md:flex items-center text-sm text-muted-foreground gap-2">
                  <span>created {getTimeAgo(space.created_at)}</span>
                  <Ellipse className="h-2 w-2 text-muted-foreground" />
                  <span>{space.source_limit} sources</span>
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 group"
              >
                <TrashLight className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={startEditing}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 group"
              >
                <EditLight className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
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

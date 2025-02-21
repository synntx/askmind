import { useUpdateSpace } from "@/hooks/useSpace";
import { CreateSpace } from "@/lib/validations";
import { Space } from "@/types/space";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface EditSpaceModalProps {
  isOpen: boolean;
  handleClose: () => void;
  space: Space;
}

export default function EditSpaceModal({
  isOpen,
  handleClose,
  space,
}: EditSpaceModalProps) {
  const [formData, setFormData] = useState<CreateSpace>({
    Title: space.title,
    Description: space.description,
  });

  const { mutate: updateSpace, isPending } = useUpdateSpace(space.space_id);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSpace(formData, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: "spring", duration: 0.2 }}
            className="bg-[#1A1A1A] border border-[#282828] rounded-lg w-full max-w-md p-6 relative"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 p-2 rounded-md text-gray-400 hover:text-white hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-6">Update Space</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="spaceName"
                  className="block text-sm font-medium text-[#CACACA]"
                >
                  Space Name
                </label>
                <input
                  type="text"
                  id="Title"
                  name="Title"
                  value={formData.Title}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-[#282828] bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
                  placeholder="Enter space name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="spaceDescription"
                  className="block text-sm font-medium text-[#CACACA]"
                >
                  Description
                </label>
                <textarea
                  id="Description"
                  name="Description"
                  value={formData.Description}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-[#282828] bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
                  placeholder="Enter space description"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-md text-gray-300 hover:text-white hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#D3D3D3] text-black font-medium py-2 rounded-md transition-colors hover:bg-[#BEBEBE] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Updating space..." : "Update Space"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

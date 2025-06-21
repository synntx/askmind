import { useDeleteSpace } from "@/hooks/useSpace";
import { Space } from "@/types/space";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface DeleteSpaceModalProps {
  isOpen: boolean;
  handleClose: () => void;
  space: Space;
}

export default function DeleteSpaceModal({
  isOpen,
  handleClose,
  space,
}: DeleteSpaceModalProps) {
  const { mutate: deleteSpace, isPending: isLoading } = useDeleteSpace();

  const handleDelete = () => {
    deleteSpace(space.space_id, {
      onSuccess: () => {
        handleClose();
      },
      onError: (error) => {
        console.error("Delete failed:", error);
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
            // initial={{ scale: 0.95, y: 10, opacity: 0 }}
            // animate={{ scale: 1, y: 0, opacity: 1 }}
            // exit={{ scale: 0.95, y: 10, opacity: 0 }}
            // transition={{ type: "spring", duration: 0.2 }}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.05, ease: "easeOut" }}
            className="bg-card border border-muted rounded-lg w-full max-w-md p-6 relative"
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 p-2 rounded-md text-muted-foreground hover:text-foreground/85 hover:bg-muted/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6 text-foreground/80">
              Delete Space
            </h2>
            <p className="block text-md text-foreground/70">
              Are you sure you want to delete{" "}
              <span className="font-semibold">&quot;{space.title}&quot;</span>?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 rounded-md text-muted-foreground hover:text-foreground/80 hover:bg-muted/60 transition-colors"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="w-1/2 bg-red-600 text-white font-medium py-2 rounded-md transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Deleting..." : "Delete Space"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

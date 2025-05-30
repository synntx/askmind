import "client-only";
import { X, Plus, Folder } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CreateSpace } from "@/lib/validations";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSpace) => void;
}

export default function CreateSpaceModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateSpaceModalProps) {
  const [formData, setFormData] = useState<CreateSpace>({
    Title: "",
    Description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setFormData({ Title: "", Description: "" });
      onClose();
    } catch (error) {
      console.error("Error creating space:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isSubmitting) {
      onClose();
    }
  };

  const isFormValid =
    formData.Title.trim().length > 0 && formData.Description.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-gradient-to-br from-background/60 via-background/50 to-background/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.05 }}
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.05, ease: "easeOut" }}
            className="bg-gradient-to-br from-card/95 to-card border border-border/50 rounded-2xl w-full max-w-lg backdrop-blur-xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* <div className="relative p-6 pb-4 bg-gradient-to-r from-primary/10 via-transparent to-primary/5"> */}
            <div className="relative p-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Folder className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2
                    id="modal-title"
                    className="text-xl font-semibold text-foreground"
                  >
                    Create New Space
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Set up your workspace for better organization
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="absolute right-4 top-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="Title"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <Folder className="w-4 h-4 text-primary" />
                  Space Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="Title"
                    name="Title"
                    value={formData.Title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
                    placeholder="e.g., My Project Workspace"
                    required
                    disabled={isSubmitting}
                    maxLength={50}
                  />
                  <div className="absolute right-3 top-3 text-xs text-muted-foreground">
                    {formData.Title.length}/50
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="Description"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  Description
                </label>
                <div className="relative">
                  <textarea
                    id="Description"
                    name="Description"
                    value={formData.Description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-muted/30 outline-none border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200 resize-none"
                    placeholder="Describe what this space will be used for..."
                    required
                    disabled={isSubmitting}
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
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
                  >
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Please fill in both the space name and description to
                      continue.
                    </p>
                  </motion.div>
                )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="flex-1 relative px-4 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none overflow-hidden group"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                      Create Space
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

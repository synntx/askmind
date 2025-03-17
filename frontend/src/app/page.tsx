"use client";

import { useToast } from "@/components/ui/toast";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const { addToast } = useToast();
  const [actionCount, setActionCount] = useState(0);
  const [animateButton, setAnimateButton] = useState<string | null>(null);

  // Trigger tap animation then execute action
  const triggerAnimation = (button: string, action: () => void) => {
    setAnimateButton(button);

    // Execute the action with a slight delay to allow animation
    setTimeout(() => {
      action();
      // Reset animation state
      setTimeout(() => setAnimateButton(null), 300);
    }, 150);
  };

  const showSuccessToast = () => {
    triggerAnimation("success", () => {
      addToast("🎉 Operation completed successfully!", "success", {
        variant: "magical",
        description:
          "Your changes have been saved, and everything is working perfectly.",
      });
    });
  };

  const showErrorToast = () => {
    triggerAnimation("error", () => {
      addToast("Unable to connect to server", "error", {
        variant: "magical",
        description:
          "There was a problem connecting to the server. Please check your internet connection.",
        action: {
          label: "Try Again",
          onClick: () => {
            setActionCount((prev) => prev + 1);
            addToast("Reconnecting...", "info");
          },
        },
      });
    });
  };

  const showWarningToast = () => {
    triggerAnimation("warning", () => {
      addToast("Session expires in 2 minutes", "warning", {
        variant: "magical",
        // haptic: true,
        action: {
          label: "Extend Session",
          onClick: () => {
            setActionCount((prev) => prev + 1);
            addToast("Session extended by 30 minutes", "success", {});
          },
        },
      });
    });
  };

  const showPremiumToast = () => {
    triggerAnimation("premium", () => {
      addToast("✨ Welcome to Premium!", "premium", {
        variant: "subtle",
        description:
          "You've unlocked all premium features. Enjoy your enhanced experience!",
        duration: 8000,
      });
    });
  };

  // Animation variants for buttons
  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.05, y: -2 },
    tap: { scale: 0.98, y: 1 },
    pressed: { scale: 0.95, y: 2 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.h1
          className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Toast Playground
        </motion.h1>

        <motion.p
          className="text-white/60 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Click the buttons below for dopamine-releasing notifications
        </motion.p>

        <div className="grid grid-cols-2 gap-4">
          <motion.button
            onClick={showSuccessToast}
            className="relative group px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 text-emerald-400 font-medium hover:from-emerald-500/30 hover:to-green-500/20 shadow-lg shadow-emerald-900/20 backdrop-blur-sm overflow-hidden border border-emerald-500/10"
            variants={buttonVariants}
            initial="idle"
            animate={animateButton === "success" ? "pressed" : "idle"}
            whileHover="hover"
            whileTap="tap"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Success Toast
            </span>
          </motion.button>

          <motion.button
            onClick={showErrorToast}
            className="relative group px-4 py-3 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/10 text-red-400 font-medium hover:from-red-500/30 hover:to-rose-500/20 shadow-lg shadow-red-900/20 backdrop-blur-sm overflow-hidden border border-red-500/10"
            variants={buttonVariants}
            initial="idle"
            animate={animateButton === "error" ? "pressed" : "idle"}
            whileHover="hover"
            whileTap="tap"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Error Toast
            </span>
          </motion.button>

          <motion.button
            onClick={showWarningToast}
            className="relative group px-4 py-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 font-medium hover:from-amber-500/30 hover:to-orange-500/20 shadow-lg shadow-amber-900/20 backdrop-blur-sm overflow-hidden border border-amber-500/10"
            variants={buttonVariants}
            initial="idle"
            animate={animateButton === "warning" ? "pressed" : "idle"}
            whileHover="hover"
            whileTap="tap"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Warning Toast
            </span>
          </motion.button>

          <motion.button
            onClick={showPremiumToast}
            className="relative group px-4 py-3 rounded-xl bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-pink-500/10 text-purple-400 font-medium hover:from-purple-500/30 hover:via-indigo-500/25 hover:to-pink-500/20 shadow-lg shadow-purple-900/20 backdrop-blur-sm overflow-hidden border border-purple-500/10"
            variants={buttonVariants}
            initial="idle"
            animate={animateButton === "premium" ? "pressed" : "idle"}
            whileHover="hover"
            whileTap="tap"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                />
              </svg>
              Premium Toast
            </span>
          </motion.button>
        </div>

        {actionCount > 0 && (
          <motion.div
            className="mt-6 text-center p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <p className="text-purple-300">
              Action button clicked {actionCount}{" "}
              {actionCount === 1 ? "time" : "times"}
            </p>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="mt-8 text-white/40 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        Try hovering over toasts to pause the timer
      </motion.div>
    </div>
  );
}

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  ReactNode,
} from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";

type ToastType = "success" | "error" | "info" | "warning" | "premium";

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "subtle" | "accent" | "magical";
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  options?: ToastOptions;
  paused: boolean;
  createdAt: number;
  duration: number;
  remainingTime: number;
}

interface ToastContextValue {
  addToast: (
    message: string,
    type?: ToastType,
    options?: ToastOptions,
  ) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const ToastIcons = {
  success: (
    <motion.svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <motion.path
        d="M8 12l3 3 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      />
    </motion.svg>
  ),
  error: (
    <motion.svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, type: "spring" }}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        d="M15 9l-6 6M9 9l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      />
    </motion.svg>
  ),
  info: (
    <motion.svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.path
        d="M12 16v-4M12 8h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
      />
    </motion.svg>
  ),
  warning: (
    <motion.svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      initial={{ y: -5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.path
        d="M12 9v4M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.2 }}
      />
    </motion.svg>
  ),
  premium: (
    <motion.svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      initial={{ rotate: -30, scale: 0, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 200,
        damping: 10,
      }}
    >
      <motion.path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6 }}
      />
    </motion.svg>
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Single interval to update all toasts - more efficient
  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();

      setToasts((currentToasts) => {
        // Skip processing if no toasts or all are paused
        if (
          currentToasts.length === 0 ||
          currentToasts.every((t) => t.paused)
        ) {
          return currentToasts;
        }

        const updatedToasts = currentToasts.map((toast) => {
          if (toast.paused) return toast;

          const elapsedTime = now - toast.createdAt;
          const remainingTime = Math.max(0, toast.duration - elapsedTime);

          return {
            ...toast,
            remainingTime,
          };
        });

        // Filter out toasts that have expired
        const visibleToasts = updatedToasts.filter(
          (toast) => toast.remainingTime > 0,
        );

        // If all toasts are gone, clear the interval
        if (visibleToasts.length === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }

        // Only trigger a re-render if something changed
        return visibleToasts.length !== currentToasts.length ||
          visibleToasts.some(
            (t, i) => t.remainingTime !== currentToasts[i].remainingTime,
          )
          ? visibleToasts
          : currentToasts;
      });
    }, 16); // Update every 16ms for smoother progress
  }, []);

  const pauseToast = useCallback((id: string) => {
    setToasts((current) =>
      current.map((toast) => {
        if (toast.id === id && !toast.paused) {
          // Calculate remaining time at the moment of pausing
          const now = Date.now();
          const elapsedTime = now - toast.createdAt;
          const remainingTime = Math.max(0, toast.duration - elapsedTime);

          return {
            ...toast,
            paused: true,
            remainingTime,
          };
        }
        return toast;
      }),
    );
  }, []);

  const resumeToast = useCallback(
    (id: string) => {
      setToasts((current) =>
        current.map((toast) => {
          if (toast.id === id && toast.paused) {
            // Update the creation time based on remaining time
            const now = Date.now();
            const adjustedCreationTime =
              now - (toast.duration - toast.remainingTime);

            return {
              ...toast,
              paused: false,
              createdAt: adjustedCreationTime,
            };
          }
          return toast;
        }),
      );

      // Ensure interval is running when a toast is resumed
      if (!intervalRef.current) {
        startInterval();
      }
    },
    [startInterval],
  );

  const addToast = useCallback(
    (message: string, type: ToastType = "info", options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const duration = options?.duration || 5000;

      const newToast: Toast = {
        id,
        message,
        type,
        options,
        paused: false,
        createdAt: Date.now(),
        duration,
        remainingTime: duration,
      };

      setToasts((currentToasts) => [newToast, ...currentToasts]);

      if (!intervalRef.current) {
        startInterval();
      }

      return id;
    },
    [startInterval],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearToasts }}>
      {children}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[90vw] w-[420px]"
        role="region"
        aria-label="Notifications"
      >
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => {
              const progress = toast.remainingTime / toast.duration;

              const getColorClasses = () => {
                const variant = toast.options?.variant || "default";

                switch (toast.type) {
                  case "success":
                    return variant === "accent"
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
                      : variant === "magical"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5"
                        : variant === "subtle"
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-emerald-500/10";
                  case "error":
                    return variant === "accent"
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white"
                      : variant === "magical"
                        ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/5"
                        : variant === "subtle"
                          ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-500/10";
                  case "warning":
                    return variant === "accent"
                      ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white"
                      : variant === "magical"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5"
                        : variant === "subtle"
                          ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 border-amber-500/10";
                  case "premium":
                    return variant === "accent"
                      ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white"
                      : variant === "magical"
                        ? "bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-pink-500/10 text-purple-400 border-purple-500/20 shadow-purple-500/5"
                        : variant === "subtle"
                          ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          : "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-purple-500/10";
                  case "info":
                  default:
                    return variant === "accent"
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                      : variant === "magical"
                        ? "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5"
                        : variant === "subtle"
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-blue-500/10";
                }
              };

              const getProgressColor = () => {
                switch (toast.type) {
                  case "success":
                    return "bg-emerald-500";
                  case "error":
                    return "bg-red-500";
                  case "warning":
                    return "bg-amber-500";
                  case "premium":
                    return "bg-purple-500";
                  case "info":
                  default:
                    return "bg-blue-500";
                }
              };

              // Classes for ring around toast
              // ${toast.paused ? "ring-2 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-900" : ""}
              // ${
              //   toast.paused
              //     ? toast.type === "success"
              //       ? "ring-emerald-500/50"
              //       : toast.type === "error"
              //         ? "ring-red-500/50"
              //         : toast.type === "warning"
              //           ? "ring-amber-500/50"
              //           : toast.type === "premium"
              //             ? "ring-purple-500/50"
              //             : "ring-blue-500/50"
              //     : ""
              // }

              return (
                <motion.div
                  layout
                  key={toast.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                    opacity: { duration: 0.2 },
                  }}
                  onMouseEnter={() => pauseToast(toast.id)}
                  onMouseLeave={() => resumeToast(toast.id)}
                  className={`relative overflow-hidden rounded-lg shadow-lg border ${getColorClasses()}`}
                  role="alert"
                >
                  {/* {toast.paused && (
                    <div className="absolute top-0 right-0 m-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-black/10 text-white/90">
                      Paused
                    </div>
                  )} */}

                  <div
                    className={`absolute bottom-0 left-0 h-[2px] ${getProgressColor()} bg-opacity-40`}
                    style={{
                      width: `${progress * 100}%`,
                      boxShadow:
                        progress > 0.75
                          ? `0 0 10px ${getProgressColor()}`
                          : "none",
                      transition: "box-shadow 0.3s ease-in",
                    }}
                  />
                  {/* <div
                    className={`absolute bottom-0 left-0 h-[3px] ${getProgressColor()}`}
                    style={{
                      width: `${progress * 100}%`,
                      transition: toast.paused ? "none" : "width 100ms linear",
                    }}
                  /> */}

                  <div className="p-4 flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-current">
                      {toast.options?.icon || ToastIcons[toast.type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{toast.message}</div>

                      {toast.options?.description && (
                        <div className="mt-1 text-sm opacity-90">
                          {toast.options.description}
                        </div>
                      )}

                      {toast.options?.action && (
                        <button
                          onClick={toast.options.action.onClick}
                          className={`
                            mt-2 px-3 py-1 text-xs font-medium rounded
                            ${
                              toast.options.variant === "accent"
                                ? "bg-white/20 hover:bg-white/30 text-white"
                                : toast.type === "success"
                                  ? "bg-emerald-100 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-200"
                                  : toast.type === "error"
                                    ? "bg-red-100 dark:bg-red-600/30 text-red-700 dark:text-red-300"
                                    : toast.type === "warning"
                                      ? "bg-amber-100 dark:bg-amber-600/30 text-amber-700 dark:text-amber-200"
                                      : toast.type === "premium"
                                        ? "bg-purple-100 dark:bg-purple-600/30 text-purple-700 dark:text-purple-200"
                                        : "bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-200"
                            }
                            transition-colors
                          `}
                        >
                          {toast.options.action.label}
                        </button>
                      )}
                    </div>

                    {/* Close button */}
                    <motion.button
                      onClick={() => removeToast(toast.id)}
                      className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                      aria-label="Close notification"
                      whileHover={{
                        // rotate: 90,
                        scale: 1.2,
                        transition: { duration: 0.2 },
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </ToastContext.Provider>
  );
}

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timeoutId?: NodeJS.Timeout; 
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now().toString();
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);

    setToasts((prev) => [...prev, { id, message, type, timeoutId }]);
  }, []);

  const pauseTimer = (toastId: string) => {
    setToasts((prev) =>
      prev.map((toast) => {
        if (toast.id === toastId && toast.timeoutId) {
          clearTimeout(toast.timeoutId);
          return { ...toast, timeoutId: undefined };
        }
        return toast;
      }),
    );
  };

  const resumeTimer = (toastId: string) => {
    setToasts((prev) =>
      prev.map((toast) => {
        if (toast.id === toastId && !toast.timeoutId) {
          const newTimeoutId = setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== toast.id));
          }, 3000);
          return { ...toast, timeoutId: newTimeoutId };
        }
        return toast;
      }),
    );
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.15,
                ease: [0.4, 0, 0.2, 1],
              }}
              onMouseEnter={() => pauseTimer(toast.id)}
              onMouseLeave={() => resumeTimer(toast.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg
                shadow-lg shadow-black/10
                backdrop-blur-md
                cursor-default
                ${
                  toast.type === "success"
                    ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
                    : toast.type === "error"
                      ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/20"
                      : "bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20"
                }
              `}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {toast.type === "success" && (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7.75 12.75L10 15.25L16.25 8.75"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {toast.type === "error" && (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 8V12M12 16H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {toast.type === "info" && (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 8V12M12 16H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {toast.message}
              </div>

              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="ml-auto hover:opacity-70 transition-opacity"
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
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

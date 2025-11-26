"use client";

import * as React from "react";
import { CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

export function Toast({ message, isVisible, onClose, type = "success" }: ToastProps) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm",
          "bg-background/95 border-border",
          type === "success" && "border-green-200 bg-green-50/95 text-green-800 dark:border-green-800 dark:bg-green-950/95 dark:text-green-200",
          type === "error" && "border-red-200 bg-red-50/95 text-red-800 dark:border-red-800 dark:bg-red-950/95 dark:text-red-200",
          type === "info" && "border-blue-200 bg-blue-50/95 text-blue-800 dark:border-blue-800 dark:bg-blue-950/95 dark:text-blue-200"
        )}
      >
        {type === "success" && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-full w-full sm:w-[380px] pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <ToastNode key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Componente Toast Singolo
const ToastNode: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const { id, message, type } = toast;

  // Icone e Stili in base al tipo
  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />,
          borderClass: "border-[hsl(var(--success)/0.25)]",
          glowClass: "shadow-[0_0_15px_rgba(34,197,94,0.1)]",
          bgGlow: "bg-[hsl(var(--success)/0.03)]",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-5 h-5 text-[hsl(var(--error))]" />,
          borderClass: "border-[hsl(var(--error)/0.25)]",
          glowClass: "shadow-[0_0_15px_rgba(239,68,68,0.1)]",
          bgGlow: "bg-[hsl(var(--error)/0.03)]",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-[hsl(var(--warning))]" />,
          borderClass: "border-[hsl(var(--warning)/0.25)]",
          glowClass: "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
          bgGlow: "bg-[hsl(var(--warning)/0.03)]",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-5 h-5 text-[hsl(var(--primary))]" />,
          borderClass: "border-[hsl(var(--primary)/0.25)]",
          glowClass: "shadow-[0_0_15px_rgba(6,182,212,0.1)]",
          bgGlow: "bg-[hsl(var(--primary)/0.03)]",
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-[var(--radius)] border backdrop-blur-md bg-[hsl(260_25%_4.5%)]/90 text-sm transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${config.borderClass} ${config.glowClass} ${config.bgGlow}`}
      role="alert"
    >
      <div className="flex gap-3 items-start flex-1 min-w-0">
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        <p className="text-neutral-200 font-medium break-words leading-relaxed text-xs sm:text-sm">
          {message}
        </p>
      </div>
      
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 btn-icon !p-1 hover:text-neutral-300 transition-colors"
        aria-label="Chiudi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  onConfirm,
  onCancel,
  isPending = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="w-full max-w-md p-6 rounded-[var(--radius)] border border-neutral-800 bg-[hsl(260_25%_4.5%)] text-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-[hsl(var(--error)/0.1)] rounded-full text-[hsl(var(--error))] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-neutral-100 mb-1">{title}</h3>
              <p className="text-neutral-400 leading-relaxed text-xs sm:text-sm">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="text-neutral-500 hover:text-neutral-300 p-1 rounded-full transition-colors disabled:opacity-50"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 rounded-[var(--radius)] font-medium text-neutral-300 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => !isPending && onConfirm()}
            disabled={isPending}
            className="px-4 py-2 bg-[hsl(var(--error))] hover:bg-[hsl(var(--error)/0.8)] rounded-[var(--radius)] font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? "Eliminazione..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

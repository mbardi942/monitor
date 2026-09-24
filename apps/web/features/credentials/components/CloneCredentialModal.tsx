"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";
import { AuthProfileDTO } from "@monitor/monitoring";
import { useToast } from "@/shared/components/Toast";

interface CloneCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: AuthProfileDTO | null;
  dashboards: { id: string; name: string }[];
  currentDashboardId: string;
  onClone: (sourceId: string, targetDashboardId: string, newName?: string) => Promise<void>;
}

export const CloneCredentialModal: React.FC<CloneCredentialModalProps> = ({
  isOpen,
  onClose,
  credential,
  dashboards,
  currentDashboardId,
  onClone,
}) => {
  const { showToast } = useToast();
  const [targetDashboardId, setTargetDashboardId] = useState("");
  const [newName, setNewName] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  // Filtra le dashboard target (può essere un'altra dashboard o la stessa con suffisso)
  const availableDashboards = dashboards;

  useEffect(() => {
    if (credential) {
      setNewName(`${credential.name} (Copia)`);
      // Default sulla prima dashboard diversa da quella corrente, se presente
      const other = dashboards.find((d) => d.id !== currentDashboardId);
      setTargetDashboardId(other ? other.id : currentDashboardId);
    }
  }, [credential, dashboards, currentDashboardId, isOpen]);

  if (!isOpen || !credential) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDashboardId) {
      showToast("Seleziona una dashboard di destinazione.", "warning");
      return;
    }
    if (!newName.trim()) {
      showToast("Specifica un nome per la credenziale clonata.", "warning");
      return;
    }

    try {
      setIsCloning(true);
      await onClone(credential.id, targetDashboardId, newName.trim());
      const targetDashName = dashboards.find((d) => d.id === targetDashboardId)?.name || "destinazione";
      showToast(`Credenziale clonata con successo nella dashboard "${targetDashName}".`, "success");
      onClose();
    } catch (err: any) {
      showToast(err.message || "Errore durante la clonazione.", "error");
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md overflow-hidden border border-neutral-800 shadow-2xl relative">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.3)] flex items-center justify-center text-[hsl(var(--primary))]">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Clona in un'altra Dashboard</h2>
              <p className="text-xs text-neutral-400">
                Duplica "{credential.name}" su un altro ambiente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Dashboard di Destinazione <span className="text-[hsl(var(--error))]">*</span>
            </label>
            <select
              value={targetDashboardId}
              onChange={(e) => setTargetDashboardId(e.target.value)}
              className="input-text text-sm cursor-pointer"
              required
            >
              {availableDashboards.map((dash) => (
                <option key={dash.id} value={dash.id} className="bg-neutral-900 text-white">
                  {dash.name} {dash.id === currentDashboardId ? "(Dashboard Corrente)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Nome della Nuova Credenziale <span className="text-[hsl(var(--error))]">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome della copia"
              className="input-text text-sm"
              required
            />
          </div>

          <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800 text-xs text-neutral-400">
            I token e i valori segreti verranno duplicati e cifrati in modo sicuro nella dashboard di destinazione.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isCloning}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isCloning}
              className="btn-primary flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {isCloning ? "Clonazione in corso..." : "Clona Ora"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

"use client";

import React, { useState, useEffect } from "react";
import { Copy, X, AlertTriangle } from "lucide-react";
import { MonitorDTO, DashboardDTO } from "@/core/ports/gateways";

interface CloneMonitorModalProps {
  isOpen: boolean;
  monitor: MonitorDTO | null;
  dashboards: DashboardDTO[];
  currentDashboardId: string;
  onConfirm: (
    targetDashboardId: string,
    newName: string
  ) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
}

export const CloneMonitorModal: React.FC<CloneMonitorModalProps> = ({
  isOpen,
  monitor,
  dashboards,
  currentDashboardId,
  onConfirm,
  onClose,
  isPending,
}) => {
  const [newName, setNewName] = useState("");
  const [targetDashboardId, setTargetDashboardId] = useState(currentDashboardId);

  // Resetta i campi ogni volta che il modal si apre su un monitor diverso
  useEffect(() => {
    if (isOpen && monitor) {
      setNewName(`${monitor.name} (Copia)`);
      setTargetDashboardId(currentDashboardId);
    }
  }, [isOpen, monitor, currentDashboardId]);

  if (!isOpen || !monitor) return null;

  const isCrossDashboard = targetDashboardId !== currentDashboardId;
  const hasAuthProfile = !!(monitor.probeConfiguration as any)?.authProfileId;
  const isHeartbeat = monitor.type === "HEARTBEAT";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onConfirm(targetDashboardId, newName.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel w-full max-w-md p-6 flex flex-col gap-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Copy className="w-4 h-4 text-[hsl(var(--primary))]" />
            Duplica Monitor
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Nome del clone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Nome della copia
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome del monitor duplicato"
              className="form-input text-sm"
              disabled={isPending}
              autoFocus
              required
            />
          </div>

          {/* Selezione dashboard di destinazione */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Dashboard di destinazione
            </label>
            <select
              value={targetDashboardId}
              onChange={(e) => setTargetDashboardId(e.target.value)}
              className="form-input text-sm"
              disabled={isPending}
            >
              {dashboards.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.id === currentDashboardId ? " (corrente)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Avvisi per clonazione cross-dashboard */}
          {isCrossDashboard && (isHeartbeat || hasAuthProfile) && (
            <div className="flex flex-col gap-2">
              {isHeartbeat && (
                <div className="flex items-start gap-2 p-3 bg-[hsl(var(--warning)/0.08)] border border-[hsl(var(--warning)/0.25)] rounded-[var(--radius-inner)] text-xs text-[hsl(var(--warning))]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Token Heartbeat rigenerato</strong> — Il monitor clonato riceverà un nuovo token webhook univoco. Aggiorna gli script di invio.
                  </span>
                </div>
              )}
              {hasAuthProfile && (
                <div className="flex items-start gap-2 p-3 bg-[hsl(var(--warning)/0.08)] border border-[hsl(var(--warning)/0.25)] rounded-[var(--radius-inner)] text-xs text-[hsl(var(--warning))]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Credenziale rimossa</strong> — Il profilo di autenticazione non è disponibile nella dashboard di destinazione. Potrai associarne uno nella nuova dashboard.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Anteprima riepilogativa */}
          <div className="bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] p-3 text-xs text-neutral-400">
            <div className="flex justify-between">
              <span className="text-neutral-500">Tipo sonda</span>
              <span className="text-white font-mono">{monitor.type}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-neutral-500">Asserzioni</span>
              <span className="text-white font-mono">
                {(monitor.assertionRules || []).length} regola/e
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-neutral-500">Destinatari notifiche</span>
              <span className="text-white font-mono">
                {isCrossDashboard
                  ? "Nessuno (cross-dashboard)"
                  : `${(monitor as any).recipientIds?.length ?? 0} destinatario/i`}
              </span>
            </div>
          </div>

          {/* Azioni */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending || !newName.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {isPending ? "Clonazione..." : "Clona Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

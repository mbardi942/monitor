"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Plus,
  Check,
  Edit2,
  Trash2,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { useDashboard } from "../context/DashboardContext";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import {
  createDashboardAction,
  renameDashboardAction,
  deleteDashboardAction,
} from "../actions/dashboard-actions";

export const DashboardSelector: React.FC = () => {
  const { dashboards, activeDashboard, setActiveDashboardId, refreshData } = useDashboard();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [newDashboardName, setNewDashboardName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chiude il dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col gap-1.5 px-2">
        <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">Dashboard</span>
        <div className="h-8 w-full bg-neutral-900/50 border border-neutral-800/40 rounded-[var(--radius-inner)] animate-pulse" />
      </div>
    );
  }

  const handleSelect = (id: string) => {
    setIsOpen(false);
    if (id !== activeDashboard?.id) {
      setActiveDashboardId(id);
    }
  };

  const handleOpenCreate = () => {
    setIsOpen(false);
    setNewDashboardName("");
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashboardName.trim()) return;

    setIsPending(true);
    setError(null);
    try {
      const created = await createDashboardAction(newDashboardName.trim());
      setIsCreateModalOpen(false);
      await refreshData();
      if (created?.id) {
        setActiveDashboardId(created.id);
      }
    } catch (err: any) {
      setError(err.message || "Errore nella creazione della dashboard.");
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenRename = () => {
    setIsOpen(false);
    setRenameValue(activeDashboard?.name || "");
    setError(null);
    setIsRenameModalOpen(true);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDashboard || !renameValue.trim()) return;

    setIsPending(true);
    setError(null);
    try {
      await renameDashboardAction(activeDashboard.id, renameValue.trim());
      setIsRenameModalOpen(false);
      await refreshData();
    } catch (err: any) {
      setError(err.message || "Errore durante la rinomina.");
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenDelete = () => {
    setIsOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeDashboard) return;

    setIsPending(true);
    try {
      await deleteDashboardAction(activeDashboard.id);
      setIsDeleteConfirmOpen(false);
      // Seleziona un'altra dashboard
      const remaining = dashboards.filter((d) => d.id !== activeDashboard.id);
      if (remaining.length > 0) {
        setActiveDashboardId(remaining[0].id);
      }
      await refreshData();
    } catch (err: any) {
      alert(err.message || "Errore durante l'eliminazione.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 px-2 relative" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          Workspace / Dashboard
        </span>
        {activeDashboard && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleOpenRename}
              title="Rinomina dashboard attiva"
              className="text-neutral-500 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            {dashboards.length > 1 && (
              <button
                type="button"
                onClick={handleOpenDelete}
                title="Elimina dashboard attiva"
                className="text-neutral-500 hover:text-[hsl(var(--error))] p-1 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/60 hover:border-[hsl(var(--primary)/0.4)] rounded-[var(--radius-inner)] text-xs text-white transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <LayoutDashboard className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0" />
          <span className="truncate font-medium">{activeDashboard?.name || "Seleziona dashboard"}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-2 right-2 mt-1.5 bg-[hsl(260_30%_6%)] border border-[hsl(var(--border-color))] rounded-[var(--radius-inner)] shadow-2xl z-50 py-1.5 max-h-64 overflow-y-auto">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800/80 mb-1">
            Le tue Dashboard ({dashboards.length})
          </div>

          {dashboards.map((dash) => {
            const isActive = dash.id === activeDashboard?.id;
            return (
              <button
                key={dash.id}
                type="button"
                onClick={() => handleSelect(dash.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  isActive
                    ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-semibold"
                    : "text-neutral-300 hover:bg-neutral-800/50 hover:text-white"
                }`}
              >
                <span className="truncate">{dash.name}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0" />}
              </button>
            );
          })}

          <div className="pt-1.5 mt-1 border-t border-neutral-800/80 px-1">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)] rounded-[var(--radius-inner)] transition-colors cursor-pointer font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Nuova Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Modal: Nuova Dashboard */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel p-6 w-full max-w-md border border-[hsl(var(--border-color))] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <LayoutDashboard className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h3>Crea Nuova Dashboard</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Inserisci un nome per la nuova dashboard tematica (es. "Ambiente Produzione", "API Pagamenti", "Microservizi").
            </p>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Nome Dashboard
                </label>
                <input
                  type="text"
                  placeholder="Es. Produzione Core"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  className="form-input w-full !text-xs"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-[hsl(var(--error))] bg-[hsl(var(--error)/0.1)] p-2 rounded border border-[hsl(var(--error)/0.2)]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isPending}
                  className="btn-secondary !text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newDashboardName.trim()}
                  className="btn-primary !text-xs flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Crea Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rinomina Dashboard */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel p-6 w-full max-w-md border border-[hsl(var(--border-color))] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <Edit2 className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h3>Rinomina Dashboard</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Modifica il nome della dashboard corrente.
            </p>

            <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Nuovo Nome
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="form-input w-full !text-xs"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-[hsl(var(--error))] bg-[hsl(var(--error)/0.1)] p-2 rounded border border-[hsl(var(--error)/0.2)]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  disabled={isPending}
                  className="btn-secondary !text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending || !renameValue.trim()}
                  className="btn-primary !text-xs flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog: Elimina Dashboard */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Elimina Dashboard"
        message={`Sei sicuro di voler eliminare la dashboard "${activeDashboard?.name}"? I monitor associati non verranno eliminati e potrai riassegnarli.`}
        confirmLabel="Elimina Dashboard"
        cancelLabel="Annulla"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        isPending={isPending}
      />
    </div>
  );
};

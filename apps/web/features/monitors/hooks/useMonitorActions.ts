"use client";

import { useCallback, useState } from "react";
import {
  pauseMonitorAction,
  resumeMonitorAction,
  executeCheckAction,
  deleteMonitorAction,
  cloneMonitorAction,
} from "../actions/monitor-actions";
import { useToast } from "@/shared/components/Toast";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";

export function useMonitorActions(onRefresh?: () => void) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();
  const { updateLocalMonitor } = useDashboard();

  const pauseToggle = useCallback(async (monitorId: string, currentStatus: string) => {
    setIsPending(true);
    const nextStatus = currentStatus === "PAUSED" ? "UP" : "PAUSED";
    // Aggiornamento ottimistico
    updateLocalMonitor(monitorId, { status: nextStatus as any });

    try {
      if (currentStatus === "PAUSED") {
        await resumeMonitorAction(monitorId);
        showToast("Monitor riattivato con successo.", "success");
      } else {
        await pauseMonitorAction(monitorId);
        showToast("Monitor messo in pausa.", "success");
      }
    } catch (err) {
      // Ripristina lo stato precedente in caso di errore
      updateLocalMonitor(monitorId, { status: currentStatus as any });
      showToast("Errore nella modifica dello stato del monitor: " + (err as Error).message, "error");
    } finally {
      setIsPending(false);
    }
  }, [updateLocalMonitor, showToast]);

  const executeCheck = useCallback(async (monitorId: string) => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      const result = await executeCheckAction(monitorId);
      showToast("Verifica manuale eseguita con successo.", "success");
      if (result) {
        // Aggiorna localmente i dati del monitor con il risultato del check
        updateLocalMonitor(monitorId, {
          lastCheckTime: result.timestamp,
          lastResponseTimeMs: result.responseTimeMs,
          lastStatus: result.status,
          status: result.status as any,
        });
      }
    } catch (err) {
      showToast("Errore nell'esecuzione del check: " + (err as Error).message, "error");
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, updateLocalMonitor, showToast]);

  const deleteMonitor = useCallback(async (monitorId: string) => {
    setIsPending(true);
    try {
      await deleteMonitorAction(monitorId);
      showToast("Monitor eliminato con successo.", "success");
      if (onRefresh) onRefresh();
      return true;
    } catch (err) {
      showToast("Errore durante l'eliminazione: " + (err as Error).message, "error");
      return false;
    } finally {
      setIsPending(false);
    }
  }, [onRefresh, showToast]);

  const cloneMonitor = useCallback(async (
    monitorId: string,
    sourceDashboardId: string,
    targetDashboardId: string,
    newName?: string
  ) => {
    setIsPending(true);
    try {
      const result = await cloneMonitorAction(monitorId, sourceDashboardId, targetDashboardId, newName);
      const isSameDashboard = sourceDashboardId === targetDashboardId;
      if (isSameDashboard) {
        showToast(`Monitor duplicato con successo.`, "success");
        if (onRefresh) onRefresh();
      } else {
        const warningMsg = result.authProfileIdDropped
          ? "Monitor clonato nella dashboard di destinazione. La credenziale di autenticazione è stata rimossa (non disponibile nell'altra dashboard)."
          : "Monitor clonato nella dashboard di destinazione con successo.";
        showToast(warningMsg, result.authProfileIdDropped ? "warning" : "success");
      }
      return result;
    } catch (err) {
      showToast("Errore durante la clonazione: " + (err as Error).message, "error");
      return null;
    } finally {
      setIsPending(false);
    }
  }, [onRefresh, showToast]);

  return { pauseToggle, executeCheck, deleteMonitor, cloneMonitor, isExecuting, isPending };
}

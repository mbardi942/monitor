"use client";

import { useCallback, useState } from "react";
import {
  generateReportAction,
  editReportAction,
  confirmReportAction,
} from "../actions/report-actions";
import { ReportDTO } from "@/core/ports/gateways";
import { useToast } from "@/shared/components/Toast";

export function useReportActions(onRefresh?: () => void) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { showToast } = useToast();

  const generateReport = useCallback(async (dashboardId: string, from: string, to: string): Promise<ReportDTO | null> => {
    setIsGenerating(true);
    try {
      const generated = await generateReportAction(dashboardId, from, to);
      showToast("Report generato con successo.", "success");
      if (onRefresh) onRefresh();
      return generated as ReportDTO;
    } catch (err) {
      showToast("Errore nella generazione del report: " + (err as Error).message, "error");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [onRefresh, showToast]);

  const editReport = useCallback(async (reportId: string, customText: string, excludedMonitorIds: string[]): Promise<ReportDTO | null> => {
    setIsSaving(true);
    try {
      const updated = await editReportAction(reportId, customText, excludedMonitorIds);
      if (onRefresh) onRefresh();
      return updated as ReportDTO;
    } catch (err) {
      showToast("Errore nel salvataggio del report: " + (err as Error).message, "error");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onRefresh, showToast]);

  const confirmReport = useCallback(async (reportId: string): Promise<boolean> => {
    setIsConfirming(true);
    try {
      await confirmReportAction(reportId);
      showToast("Report confermato e inviato con successo.", "success");
      if (onRefresh) onRefresh();
      return true;
    } catch (err) {
      showToast("Errore nell'invio del report: " + (err as Error).message, "error");
      return false;
    } finally {
      setIsConfirming(false);
    }
  }, [onRefresh, showToast]);

  return {
    generateReport,
    editReport,
    confirmReport,
    isGenerating,
    isSaving,
    isConfirming,
  };
}

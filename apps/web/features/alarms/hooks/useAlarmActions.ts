"use client";

import { useCallback, useState } from "react";
import { resolveAlarmAction } from "../actions/alarm-actions";
import { useToast } from "@/shared/components/Toast";

export function useAlarmActions(onRefresh?: () => void) {
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const { showToast } = useToast();

  const resolveAlarm = useCallback(async (alarmId: string) => {
    setIsResolving(alarmId);
    try {
      await resolveAlarmAction(alarmId);
      showToast("Allarme risolto con successo.", "success");
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast("Errore nella risoluzione dell'allarme: " + (err as Error).message, "error");
    } finally {
      setIsResolving(null);
    }
  }, [onRefresh, showToast]);

  return { resolveAlarm, isResolving };
}

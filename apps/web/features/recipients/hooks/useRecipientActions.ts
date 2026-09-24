"use client";

import { useCallback, useState } from "react";
import { addRecipientAction, deleteRecipientAction } from "../actions/recipient-actions";
import { useToast } from "@/shared/components/Toast";

export function useRecipientActions(onRefresh?: () => void) {
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { showToast } = useToast();

  const addRecipient = useCallback(async (dashboardId: string, name: string, email?: string, slackWebhook?: string) => {
    setIsAdding(true);
    try {
      await addRecipientAction(dashboardId, name, email, slackWebhook);
      showToast("Destinatario aggiunto con successo.", "success");
      if (onRefresh) onRefresh();
      return true;
    } catch (err) {
      showToast("Errore nell'aggiunta del destinatario: " + (err as Error).message, "error");
      return false;
    } finally {
      setIsAdding(false);
    }
  }, [onRefresh, showToast]);

  const deleteRecipient = useCallback(async (recipientId: string) => {
    if (!confirm("Rimuovere questo destinatario? Non riceverà più notifiche relative agli allarmi di questa dashboard.")) {
      return;
    }
    setIsDeleting(recipientId);
    try {
      await deleteRecipientAction(recipientId);
      showToast("Destinatario rimosso con successo.", "success");
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast("Errore nella rimozione del destinatario: " + (err as Error).message, "error");
    } finally {
      setIsDeleting(null);
    }
  }, [onRefresh, showToast]);

  return { addRecipient, deleteRecipient, isAdding, isDeleting };
}

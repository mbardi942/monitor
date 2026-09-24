"use client";

import React, { useState } from "react";
import { Users, Mail, Slack, Plus, Trash2, ShieldAlert } from "lucide-react";
import { RecipientDTO } from '@/core/ports/gateways';
import { useRecipientActions } from '../hooks/useRecipientActions';
import { useToast } from "@/shared/components/Toast";

interface RecipientSettingsProps {
  dashboardId: string;
  recipients: RecipientDTO[];
  onRefresh: () => void;
}

export const RecipientSettings: React.FC<RecipientSettingsProps> = ({
  dashboardId,
  recipients,
  onRefresh,
}) => {
  const { addRecipient, deleteRecipient, isAdding, isDeleting } = useRecipientActions(onRefresh);
  const { showToast } = useToast();

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !slackWebhook) {
      showToast("Fornisci almeno un canale: inserisci un indirizzo e-mail o un webhook Slack.", "warning");
      return;
    }
    const success = await addRecipient(
      dashboardId,
      name,
      email || undefined,
      slackWebhook || undefined
    );
    if (success) {
      // Reset form
      setName("");
      setEmail("");
      setSlackWebhook("");
    }
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    await deleteRecipient(recipientId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sinistra: Form Nuovo Destinatario */}
      <div className="flex flex-col gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[hsl(var(--primary))]" /> Aggiungi Destinatario Notifiche
          </h3>
          <form onSubmit={handleAddRecipient} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Nome Contatto</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. On-Call Ops"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Canale Email (Opzionale)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops-alerts@tuo-dominio.com"
                className="form-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Canale Webhook Slack (Opzionale)</label>
              <input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="form-input font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" /> {isAdding ? "Aggiunta..." : "Aggiungi Contatto"}
            </button>
          </form>
        </div>
      </div>

      {/* Destra: Destinatari Attivi */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[hsl(var(--primary))]" /> Elenco Destinatari Allarmi
          </h3>

          {recipients.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-12">Nessun destinatario impostato per ricevere notifiche.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-4 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius)]"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="icon-container mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm text-white font-semibold">{recipient.name}</h4>
                      
                      {/* Canali abilitati */}
                      <div className="flex gap-2.5 mt-2">
                        {recipient.channels.map((chan, idx) => {
                          const isEmail = chan.type === "EMAIL";
                          return (
                            <span
                              key={idx}
                              className="text-[10px] text-neutral-400 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 px-2 py-0.5 rounded-[var(--radius-inner)] flex items-center gap-1.5 font-mono"
                            >
                              {isEmail ? <Mail className="w-3 h-3 text-neutral-500" /> : <Slack className="w-3 h-3 text-[hsl(var(--success))]" />}
                              {isEmail ? chan.config.email : "Slack Webhook"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                   <button
                    onClick={() => handleDeleteRecipient(recipient.id)}
                    disabled={isDeleting === recipient.id}
                    className="btn-icon hover:text-[hsl(var(--error))] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Rimuovi Destinatario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

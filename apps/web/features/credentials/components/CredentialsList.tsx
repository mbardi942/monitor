"use client";

import React, { useState } from "react";
import {
  Key,
  Plus,
  ShieldCheck,
  UserCheck,
  Layers,
  Copy,
  Edit2,
  Trash2,
  Search,
  Lock,
  ExternalLink,
  Zap,
} from "lucide-react";
import { AuthProfileDTO, AuthProfileType } from "@monitor/monitoring";
import { CredentialModal } from "./CredentialModal";
import { CloneCredentialModal } from "./CloneCredentialModal";
import {
  createCredentialAction,
  updateCredentialAction,
  deleteCredentialAction,
  cloneCredentialToDashboardAction,
} from "../actions/credential-actions";
import { useToast } from "@/shared/components/Toast";
import { useRouter } from "next/navigation";

interface CredentialsListProps {
  dashboardId: string;
  credentials: AuthProfileDTO[];
  dashboards: { id: string; name: string }[];
}

export const CredentialsList: React.FC<CredentialsListProps> = ({
  dashboardId,
  credentials,
  dashboards,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<AuthProfileDTO | null>(null);
  const [cloningCred, setCloningCred] = useState<AuthProfileDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = credentials.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data: {
    name: string;
    type: AuthProfileType;
    data: Record<string, any>;
  }) => {
    if (editingCred) {
      await updateCredentialAction(editingCred.id, data);
    } else {
      await createCredentialAction(dashboardId, data);
    }
    router.refresh();
  };

  const handleClone = async (sourceId: string, targetDashboardId: string, newName?: string) => {
    await cloneCredentialToDashboardAction(sourceId, targetDashboardId, newName);
    router.refresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la credenziale "${name}"? I monitor che la utilizzano potrebbero non riuscire più ad autenticarsi.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteCredentialAction(id);
      showToast(`Credenziale "${name}" eliminata con successo.`, "success");
      router.refresh();
    } catch (err: any) {
      showToast(err.message || "Errore durante l'eliminazione.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadge = (type: AuthProfileType) => {
    switch (type) {
      case "BEARER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/60">
            <Key className="w-3 h-3 text-purple-400" /> Bearer Token
          </span>
        );
      case "API_KEY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/60">
            <ShieldCheck className="w-3 h-3 text-blue-400" /> API Key
          </span>
        );
      case "BASIC_AUTH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <UserCheck className="w-3 h-3 text-emerald-400" /> Basic Auth
          </span>
        );
      case "CUSTOM_HEADERS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
            <Layers className="w-3 h-3 text-cyan-400" /> Custom Headers
          </span>
        );
      case "OAUTH2_CLIENT_CREDENTIALS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/60">
            <Lock className="w-3 h-3 text-purple-400" /> OAuth2 Client
          </span>
        );
      case "DYNAMIC_LOGIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
            <Zap className="w-3 h-3 text-amber-400" /> Dynamic Login
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-900 text-neutral-400 border border-neutral-800">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header Sezione */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.3)] flex items-center justify-center text-[hsl(var(--primary))]">
              <Key className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Credential Vault & Profili di Autenticazione
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Centralizza token, chiavi API e intestazioni HTTP protette per riutilizzarle sui tuoi monitor senza duplicare segreti
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCred(null);
            setIsCreateOpen(true);
          }}
          className="btn-primary flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuova Credenziale
        </button>
      </div>

      {/* Info Banner di Sicurezza */}
      <div className="glass-panel p-4 flex items-center justify-between gap-4 border-l-4 border-l-[hsl(var(--primary))] bg-gradient-to-r from-[hsl(var(--primary)/0.05)] to-transparent">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-[hsl(var(--primary))] shrink-0" />
          <div className="text-xs text-neutral-300 leading-relaxed">
            I valori inseriti nel Vault sono <strong>cifrati a riposo (AES-256-GCM)</strong> e mascherati nell'interfaccia.
            Puoi associarli direttamente alle sonde HTTP durante la creazione o modifica dei monitor.
          </div>
        </div>
      </div>

      {/* Barra di Ricerca & Contatori */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca per nome o tipo..."
            className="input-text text-xs pl-9 w-full"
          />
        </div>
        <div className="text-xs text-neutral-400 font-medium self-center">
          Totale credenziali registrate: <strong className="text-white font-mono">{credentials.length}</strong>
        </div>
      </div>

      {/* Elenco Credenziali */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Nessuna credenziale trovata</h3>
          <p className="text-xs text-neutral-400 max-w-md">
            {searchTerm
              ? "Nessun profilo corrisponde ai criteri di ricerca impostati."
              : "Non hai ancora salvato alcun token o profilo di autenticazione in questa dashboard."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setEditingCred(null);
                setIsCreateOpen(true);
              }}
              className="btn-primary text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi la prima credenziale
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cred) => (
            <div
              key={cred.id}
              className="glass-panel p-5 flex flex-col justify-between gap-4 hover:border-neutral-700/80 transition-all group relative"
            >
              <div className="flex flex-col gap-3">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate" title={cred.name}>
                      {cred.name}
                    </h3>
                    <div>{getTypeBadge(cred.type)}</div>
                  </div>
                </div>

                {/* Summary degli Header Inseriti */}
                <div className="bg-neutral-900/80 p-3 rounded-md border border-neutral-800/80 flex flex-col gap-1.5 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-sans font-semibold">
                    Header Iniettati:
                  </span>
                  {cred.headersSummary && cred.headersSummary.length > 0 ? (
                    cred.headersSummary.map((hs, i) => (
                      <div key={i} className="truncate text-neutral-400" title={hs}>
                        • {hs}
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-500 italic">Nessun header generato</div>
                  )}
                </div>
              </div>

              {/* Footer & Azioni Rapide */}
              <div className="flex items-center justify-between border-t border-neutral-800/70 pt-3 mt-1">
                <span className="text-[10px] text-neutral-500">
                  Aggiornato: {new Date(cred.updatedAt).toLocaleDateString("it-IT")}
                </span>

                <div className="flex items-center gap-1">
                  {/* Clona in altra dashboard */}
                  <button
                    type="button"
                    onClick={() => setCloningCred(cred)}
                    className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
                    title="Clona in un'altra dashboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Modifica */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCred(cred);
                      setIsCreateOpen(true);
                    }}
                    className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
                    title="Modifica credenziale"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Elimina */}
                  <button
                    type="button"
                    onClick={() => handleDelete(cred.id, cred.name)}
                    disabled={deletingId === cred.id}
                    className="p-1.5 rounded text-neutral-400 hover:text-[hsl(var(--error))] hover:bg-neutral-800/80 transition-colors"
                    title="Elimina credenziale"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale Creazione / Modifica */}
      <CredentialModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCred(null);
        }}
        onSave={handleSave}
        editingCredential={editingCred}
      />

      {/* Modale Clonazione Cross-Dashboard */}
      <CloneCredentialModal
        isOpen={!!cloningCred}
        onClose={() => setCloningCred(null)}
        credential={cloningCred}
        dashboards={dashboards}
        currentDashboardId={dashboardId}
        onClone={handleClone}
      />
    </div>
  );
};

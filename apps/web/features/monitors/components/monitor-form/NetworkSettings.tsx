import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Key,
  Code,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";
import { useToast } from "@/shared/components/Toast";
import { MonitorFormState, MonitorFormAction } from "./types";

interface NetworkSettingsProps {
  state: MonitorFormState;
  dispatch: React.Dispatch<MonitorFormAction>;
}

export const NetworkSettings: React.FC<NetworkSettingsProps> = ({ state, dispatch }) => {
  const {
    type,
    url,
    method,
    timeoutMs,
    host,
    port,
    token,
    heartbeatToken,
    expectedIntervalSeconds,
    gracePeriodSeconds,
    intervalSeconds,
    headers,
    authProfileId,
    body,
  } = state;

  const { authProfiles } = useDashboard();
  const selectedProfile = (authProfiles || []).find((p) => p.id === authProfileId);

  const [showHeaders, setShowHeaders] = useState(headers.length > 0);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"POWERSHELL" | "BASH" | "TASK_SCHEDULER" | "ROUTEROS">("POWERSHELL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const webhookUrl = `${origin || "http://localhost:3000"}/api/heartbeats/${heartbeatToken || "hb_sec_token"}`;

  const setUrl = (val: string) => dispatch({ type: "SET_FIELD", field: "url", value: val });
  const setMethod = (val: string) => dispatch({ type: "SET_FIELD", field: "method", value: val });
  const setTimeoutMs = (val: number) => dispatch({ type: "SET_FIELD", field: "timeoutMs", value: val });
  const setHost = (val: string) => dispatch({ type: "SET_FIELD", field: "host", value: val });
  const setPort = (val: number) => dispatch({ type: "SET_FIELD", field: "port", value: val });
  const setToken = (val: string) => dispatch({ type: "SET_FIELD", field: "token", value: val });
  const setHeartbeatToken = (val: string) => dispatch({ type: "SET_FIELD", field: "heartbeatToken", value: val });
  const setExpectedIntervalSeconds = (val: number) => dispatch({ type: "SET_FIELD", field: "expectedIntervalSeconds", value: val });
  const setGracePeriodSeconds = (val: number) => dispatch({ type: "SET_FIELD", field: "gracePeriodSeconds", value: val });
  const setIntervalSeconds = (val: number) => dispatch({ type: "SET_FIELD", field: "intervalSeconds", value: val });
  const setAuthProfileId = (val: string) => dispatch({ type: "SET_FIELD", field: "authProfileId", value: val });
  const setBody = (val: string) => dispatch({ type: "SET_FIELD", field: "body", value: val });

  const handleRegenerateToken = () => {
    const newToken = `hb_sec_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 8)}`;
    setHeartbeatToken(newToken);
  };

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleAddHeader = (key = "", value = "") => {
    dispatch({ type: "ADD_HEADER", key, value });
    setShowHeaders(true);
  };

  const handleRemoveHeader = (index: number) => {
    dispatch({ type: "REMOVE_HEADER", index });
  };

  const handleHeaderChange = (index: number, field: "key" | "value", value: string) => {
    dispatch({ type: "SET_HEADER_FIELD", index, field, value });
  };

  const { showToast } = useToast();

  const handleFormatJsonBody = () => {
    try {
      if (!body.trim()) return;
      const parsed = JSON.parse(body);
      setBody(JSON.stringify(parsed, null, 2));
      showToast("JSON formattato correttamente.", "success");
    } catch (err: any) {
      showToast(`Il testo non è un JSON valido: ${err?.message || "errore di sintassi"}`, "error");
    }
  };

  const isBodyAllowed = method !== "GET" && method !== "HEAD";

  // Snippet generators
  const powershellSnippet = `# Script PowerShell (Windows Server / Backup Task)
$payload = @{
    status = "OK"
    backup_date = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    size_mb = 350
} | ConvertTo-Json

Invoke-RestMethod -Uri "${webhookUrl}" -Method POST -Body $payload -ContentType "application/json"`;

  const bashSnippet = `# cURL / Bash (Linux Cronjob o Script)
# Invia un ping semplice:
curl -fsS -m 10 --retry 3 "${webhookUrl}"

# Oppure invia payload JSON con metriche:
curl -fsS -m 10 -X POST "${webhookUrl}" \\
     -H "Content-Type: application/json" \\
     -d '{"status":"OK","backup_size_gb":14}'`;

  const taskSchedulerSnippet = `# Crea automaticamente il task pianificato su Windows (Esegui come Amministratore)
$Action = New-ScheduledTaskAction -Execute 'curl.exe' -Argument '-fsS "${webhookUrl}"'
$Trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "MonitorCheck_${state.name ? state.name.replace(/\\s+/g, '_') : 'Heartbeat'}" -Action $Action -Trigger $Trigger -User "SYSTEM"`;

  const routerOsSnippet = `# MikroTik RouterOS (Script o Scheduler)
/tool fetch url="${webhookUrl}" keep-result=no`;

  return (
    <div className="border-t border-neutral-800/80 pt-4 flex flex-col gap-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
          Configurazione Target (Probe)
        </h3>
        {type === "HTTP" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group md:col-span-3">
              <label className="form-label">URL del Check</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tuo-sito.com/api/health"
                className="form-input font-mono"
              />
            </div>
            <div className="form-group md:col-span-3">
              <label className="form-label">Metodo HTTP</label>
              <SegmentedControl
                value={method}
                onChange={(val) => setMethod(val)}
                fullWidth={false}
                options={[
                  { value: "GET", label: "GET" },
                  { value: "POST", label: "POST" },
                  { value: "PUT", label: "PUT" },
                  { value: "PATCH", label: "PATCH" },
                  { value: "DELETE", label: "DELETE" },
                  { value: "HEAD", label: "HEAD" },
                ]}
              />
            </div>
            <div className="form-group md:col-span-1">
              <label className="form-label">Timeout (Millisecondi)</label>
              <input
                type="number"
                min="500"
                max="30000"
                required
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="form-input font-mono"
              />
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label">Intervallo Esecuzione</label>
              <select
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="form-select"
              >
                <option value={30}>Ogni 30 secondi</option>
                <option value={60}>Ogni 60 secondi (1 min)</option>
                <option value={120}>Ogni 120 secondi (2 min)</option>
                <option value={300}>Ogni 5 minuti</option>
                <option value={600}>Ogni 10 minuti</option>
              </select>
            </div>

            {/* Profilo di Autenticazione (Shared Vault) */}
            <div className="form-group md:col-span-3 bg-neutral-900/60 p-3.5 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0 flex items-center gap-1.5 text-xs text-white">
                  <Key className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  Profilo di Autenticazione (Vault Condiviso)
                </label>
                <span className="text-[10px] text-neutral-400 font-mono">Opzionale</span>
              </div>
              <select
                value={authProfileId || ""}
                onChange={(e) => setAuthProfileId(e.target.value)}
                className="form-select text-xs"
              >
                <option value="">Nessun profilo (Usa header manuali o nessuna auth)</option>
                {(authProfiles || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>

              {selectedProfile ? (
                <div className="mt-2.5 p-2.5 bg-black/40 rounded border border-neutral-800 text-[11px] text-neutral-300 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-neutral-400 font-semibold">Header iniettati:</span>
                    <span className="font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40 text-[10px]">
                      {selectedProfile.headersSummary?.join(", ") || selectedProfile.type}
                    </span>
                    {(selectedProfile.type === "DYNAMIC_LOGIN" || selectedProfile.type === "OAUTH2_CLIENT_CREDENTIALS") && (
                      <span className="text-[10px] bg-amber-950/40 text-amber-300 border border-amber-800/40 px-1.5 py-0.5 rounded font-mono">
                        ⚡ Pre-flight Login & Caching
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    {selectedProfile.type === "DYNAMIC_LOGIN" || selectedProfile.type === "OAUTH2_CLIENT_CREDENTIALS"
                      ? "Il token verrà acquisito con pre-flight login, conservato in cache e rinnovato automaticamente prima della scadenza."
                      : "Gli header del profilo verranno inclusi automaticamente. Puoi aggiungere ulteriori header specifici in basso per estenderli o fare override."}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-neutral-500 mt-1.5">
                  Seleziona un profilo salvato nel Vault per iniettare Bearer Token, API Key, Basic Auth o autenticazione dinamica.
                </p>
              )}
            </div>
          </div>
        ) : type === "PING" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group md:col-span-2">
              <label className="form-label">Host / IP Address</label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="db.replica.local"
                className="form-input font-mono"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Porta TCP</label>
              <input
                type="number"
                min="1"
                max="65535"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="form-input font-mono"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Intervallo Esecuzione</label>
              <select
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="form-select"
              >
                <option value={30}>Ogni 30 secondi</option>
                <option value={60}>Ogni 60 secondi (1 min)</option>
                <option value={120}>Ogni 120 secondi (2 min)</option>
                <option value={300}>Ogni 5 minuti</option>
              </select>
            </div>
          </div>
        ) : type === "HOST" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group md:col-span-2">
              <label className="form-label">Agent URL (Metrics endpoint)</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://192.168.1.50:9500/metrics"
                className="form-input font-mono"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Agent Token (Bearer)</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token di sicurezza"
                className="form-input font-mono"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Timeout (Millisecondi)</label>
              <input
                type="number"
                min="500"
                max="30000"
                required
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="form-input font-mono"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Intervallo Esecuzione</label>
              <select
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="form-select"
              >
                <option value={30}>Ogni 30 secondi</option>
                <option value={60}>Ogni 60 secondi (1 min)</option>
                <option value={120}>Ogni 120 secondi (2 min)</option>
                <option value={300}>Ogni 5 minuti</option>
                <option value={600}>Ogni 10 minuti</option>
              </select>
            </div>
          </div>
        ) : (
          /* TIPO HEARTBEAT (SONDA PUSH) */
          <div className="flex flex-col gap-5">
            <div className="bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                      Parametri di Ascolto Heartbeat (Dead Man's Switch)
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                    Il monitor attende le richieste HTTP dal tuo server o script. Se nessun ping perviene entro l'intervallo atteso sommato al tempo di grazia, scatterà automaticamente l'allarme <strong>DOWN</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="form-group">
                  <label className="form-label">Frequenza Prevista (Intervallo)</label>
                  <select
                    value={expectedIntervalSeconds}
                    onChange={(e) => setExpectedIntervalSeconds(Number(e.target.value))}
                    className="form-select font-mono text-xs"
                  >
                    <option value={600}>Ogni 10 minuti</option>
                    <option value={1800}>Ogni 30 minuti</option>
                    <option value={3600}>Ogni 1 ora (60 min)</option>
                    <option value={21600}>Ogni 6 ore</option>
                    <option value={43200}>Ogni 12 ore</option>
                    <option value={86400}>Ogni 24 ore (1 giorno - backup notturni)</option>
                    <option value={604800}>Ogni 7 giorni (settimanale)</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 mt-1">
                    Con quale frequenza lo script locale invierà il ping.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Periodo di Tolleranza (Grace Period)</label>
                  <select
                    value={gracePeriodSeconds}
                    onChange={(e) => setGracePeriodSeconds(Number(e.target.value))}
                    className="form-select font-mono text-xs"
                  >
                    <option value={300}>5 minuti di tolleranza</option>
                    <option value={600}>10 minuti di tolleranza</option>
                    <option value={1800}>30 minuti di tolleranza</option>
                    <option value={3600}>1 ora di tolleranza</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 mt-1">
                    Margine di ritardo consentito prima di lanciare l'allarme.
                  </span>
                </div>
              </div>

              {/* Endpoint Webhook & Token */}
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/60">
                <label className="form-label flex justify-between items-center">
                  <span>URL Webhook di Ingestione Ping</span>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Rigenera Token
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="form-input font-mono text-xs bg-neutral-950 text-[hsl(var(--primary))] select-all flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookUrl, "url")}
                    className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedKey === "url" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> Copiato!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copia URL
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Generatore di Snippet e Comandi Pronti per PMI */}
            <div className="bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Snippet Pronti per l'Integrazione (Copia & Incolla)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentText =
                      activeSnippetTab === "POWERSHELL"
                        ? powershellSnippet
                        : activeSnippetTab === "BASH"
                        ? bashSnippet
                        : activeSnippetTab === "TASK_SCHEDULER"
                        ? taskSchedulerSnippet
                        : routerOsSnippet;
                    handleCopy(currentText, activeSnippetTab);
                  }}
                  className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === activeSnippetTab ? (
                    <>
                      <Check className="w-3 h-3 text-[hsl(var(--success))]" /> Copiato!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copia Snippet
                    </>
                  )}
                </button>
              </div>

              {/* Tabs linguaggi snippet */}
              <div className="flex gap-1 border-b border-neutral-800 pb-2 overflow-x-auto text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveSnippetTab("POWERSHELL")}
                  className={`px-3 py-1 rounded-[var(--radius-inner)] font-mono transition-colors cursor-pointer ${
                    activeSnippetTab === "POWERSHELL"
                      ? "bg-[hsl(var(--primary))/0.15] text-white border border-[hsl(var(--primary))/0.4]"
                      : "text-neutral-400 hover:text-white bg-neutral-900/60"
                  }`}
                >
                  PowerShell (Windows)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSnippetTab("BASH")}
                  className={`px-3 py-1 rounded-[var(--radius-inner)] font-mono transition-colors cursor-pointer ${
                    activeSnippetTab === "BASH"
                      ? "bg-[hsl(var(--primary))/0.15] text-white border border-[hsl(var(--primary))/0.4]"
                      : "text-neutral-400 hover:text-white bg-neutral-900/60"
                  }`}
                >
                  cURL / Linux Cron
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSnippetTab("TASK_SCHEDULER")}
                  className={`px-3 py-1 rounded-[var(--radius-inner)] font-mono transition-colors cursor-pointer ${
                    activeSnippetTab === "TASK_SCHEDULER"
                      ? "bg-[hsl(var(--primary))/0.15] text-white border border-[hsl(var(--primary))/0.4]"
                      : "text-neutral-400 hover:text-white bg-neutral-900/60"
                  }`}
                >
                  Auto-Task Scheduler (1-Click)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSnippetTab("ROUTEROS")}
                  className={`px-3 py-1 rounded-[var(--radius-inner)] font-mono transition-colors cursor-pointer ${
                    activeSnippetTab === "ROUTEROS"
                      ? "bg-[hsl(var(--primary))/0.15] text-white border border-[hsl(var(--primary))/0.4]"
                      : "text-neutral-400 hover:text-white bg-neutral-900/60"
                  }`}
                >
                  MikroTik RouterOS
                </button>
              </div>

              {/* Code preview */}
              <pre className="p-3 bg-neutral-950 text-neutral-300 font-mono text-[11px] rounded border border-neutral-900 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {activeSnippetTab === "POWERSHELL" && powershellSnippet}
                {activeSnippetTab === "BASH" && bashSnippet}
                {activeSnippetTab === "TASK_SCHEDULER" && taskSchedulerSnippet}
                {activeSnippetTab === "ROUTEROS" && routerOsSnippet}
              </pre>
            </div>
          </div>
        )}
      </div>


      {/* HTTP Advanced Settings: Custom Headers & Request Body */}
      {type === "HTTP" && (
        <div className="flex flex-col gap-4 pt-4 border-t border-neutral-800/60">
          {/* Sezione Custom Headers */}
          <div className="bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Header HTTP Personalizzati
                </span>
                {headers.length > 0 && (
                  <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-mono">
                    {headers.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHeaders(!showHeaders)}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showHeaders ? (
                    <>
                      Nascondi <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Mostra ({headers.length}) <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddHeader()}
                  className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi Header
                </button>
              </div>
            </div>

            {/* Quick Presets Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
              <span className="text-neutral-500 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[hsl(var(--warning))]" /> Preset rapidi:
              </span>
              <button
                type="button"
                onClick={() => handleAddHeader("Content-Type", "application/json")}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-mono transition-colors cursor-pointer"
              >
                + JSON Content-Type
              </button>
              <button
                type="button"
                onClick={() => handleAddHeader("Authorization", "Bearer ")}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-mono transition-colors cursor-pointer"
              >
                + Bearer Token
              </button>
              <button
                type="button"
                onClick={() => handleAddHeader("X-API-Key", "")}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-mono transition-colors cursor-pointer"
              >
                + X-API-Key
              </button>
              <button
                type="button"
                onClick={() => handleAddHeader("Accept", "application/json")}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-mono transition-colors cursor-pointer"
              >
                + Accept JSON
              </button>
            </div>

            {/* Headers Rows */}
            {showHeaders && (
              <div className="flex flex-col gap-2.5 pt-2">
                {headers.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-1">
                    Nessun header personalizzato configurato. Clicca su un preset o su "Aggiungi Header".
                  </p>
                ) : (
                  headers.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nome Header (es. Authorization)"
                        value={h.key}
                        onChange={(e) => handleHeaderChange(idx, "key", e.target.value)}
                        className="form-input !py-1.5 !px-3 font-mono text-xs w-2/5"
                      />
                      <input
                        type="text"
                        placeholder="Valore (es. Bearer secret-token-123)"
                        value={h.value}
                        onChange={(e) => handleHeaderChange(idx, "value", e.target.value)}
                        className="form-input !py-1.5 !px-3 font-mono text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHeader(idx)}
                        className="text-neutral-500 hover:text-[hsl(var(--error))] p-1.5 transition-colors cursor-pointer"
                        title="Rimuovi header"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sezione Request Body (solo per POST / PUT / PATCH / DELETE) */}
          {isBodyAllowed && (
            <div className="bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Corpo della Richiesta (Request Body - {method})
                  </label>
                </div>
                {body && (
                  <button
                    type="button"
                    onClick={handleFormatJsonBody}
                    className="text-[11px] text-[hsl(var(--primary))] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Formatta JSON
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                Inserisci il payload inviato nel corpo della richiesta HTTP (es. JSON, XML o stringa grezza).
              </p>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={'{\n  "service": "healthcheck",\n  "status": "ping"\n}'}
                className="form-input font-mono text-xs w-full leading-relaxed resize-y mt-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};


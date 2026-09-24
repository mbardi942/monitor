import React, { useState, useReducer } from "react";
import { ArrowLeft, Save, Globe, ShieldAlert, Database, Bell, ChevronLeft, ChevronRight, Play, CheckCircle } from "lucide-react";
import { MonitorDTO } from '@/core/ports/gateways';
import { createMonitorAction, updateMonitorAction, testTargetAction } from '../../actions/monitor-actions';
import { useToast } from "@/shared/components/Toast";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { useDashboard } from "@/features/dashboard/context/DashboardContext";

import { monitorFormReducer, initMonitorFormState } from "./reducer";
import { NetworkSettings } from "./NetworkSettings";
import { AssertionRules } from "./AssertionRules";
import { AdvancedExtractors } from "./AdvancedExtractors";
import { TestTargetModal, TestTargetMode } from "./TestTargetModal";

interface MonitorFormProps {
  dashboardId: string;
  editingMonitor?: MonitorDTO;
  onBack: () => void;
  onSaved: () => void;
}

type FormTab = "TARGET" | "ASSERTIONS" | "EXTRACTION" | "RECIPIENTS";

export const MonitorForm: React.FC<MonitorFormProps> = ({
  dashboardId,
  editingMonitor,
  onBack,
  onSaved,
}) => {
  const { showToast } = useToast();
  const { recipients: availableRecipients } = useDashboard();
  const [activeTab, setActiveTab] = useState<FormTab>("TARGET");
  const [isSaving, setIsSaving] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testMode, setTestMode] = useState<TestTargetMode>("CONNECTION");

  const [state, dispatch] = useReducer(
    monitorFormReducer,
    editingMonitor,
    initMonitorFormState
  );

  const {
    name,
    type,
    url,
    method,
    headers,
    authProfileId,
    body,
    timeoutMs,
    host,
    port,
    token,
    heartbeatToken,
    expectedIntervalSeconds,
    gracePeriodSeconds,
    intervalSeconds,
    rules,
    consecutiveFailures,
    metricRules,
    enableExtractor,
    displayHint,
    maxRows,
    pageSize,
    retainHistory,
    schemaType,
    singleValuePath,
    singleValueLabel,
    singleValueUnit,
    singleValueFormat,
    singleValueDecimals,
    tableDataPath,
    tableColumns,
    keyValuePairs,
    recipientIds,
  } = state;

  const setName = (val: string) => dispatch({ type: "SET_FIELD", field: "name", value: val });
  const setType = (val: any) => dispatch({ type: "SET_FIELD", field: "type", value: val });
  const setConsecutiveFailures = (val: number) => dispatch({ type: "SET_FIELD", field: "consecutiveFailures", value: val });

  const getHeadersRecord = () => {
    if (type !== "HTTP" || !headers || headers.length === 0) return undefined;
    const record: Record<string, string> = {};
    for (const h of headers) {
      const k = h.key.trim();
      if (k) record[k] = h.value;
    }
    return Object.keys(record).length > 0 ? record : undefined;
  };

  const buildProbeConfiguration = () => {
    if (type === "HTTP") {
      const hdrs = getHeadersRecord();
      return {
        url,
        method,
        headers: hdrs,
        body: method !== "GET" && method !== "HEAD" && body.trim() !== "" ? body : undefined,
        timeoutMs,
        authProfileId: authProfileId || undefined,
      };
    }
    if (type === "PING") {
      return { host, port };
    }
    if (type === "HEARTBEAT") {
      return {
        heartbeatToken,
        expectedIntervalSeconds,
        gracePeriodSeconds,
      };
    }
    return { url, token, timeoutMs };
  };


  const TAB_LIST: { id: FormTab; label: string; icon: any; badge?: string }[] = [
    { id: "TARGET", label: "Target & Rete", icon: Globe },
    { id: "ASSERTIONS", label: "Criteri Uptime", icon: ShieldAlert },
    {
      id: "EXTRACTION",
      label: "Estrazione Dati",
      icon: Database,
      badge: type === "PING" ? undefined : enableExtractor ? "Attivo" : "Opzionale",
    },
    {
      id: "RECIPIENTS",
      label: "Notifiche",
      icon: Bell,
      badge: recipientIds.length > 0 ? `${recipientIds.length}` : undefined,
    },
  ];

  const currentTabIndex = TAB_LIST.findIndex((t) => t.id === activeTab);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Validazione preventiva cross-tab dei campi obbligatori
    if (!name.trim()) {
      showToast("Inserisci un nome descrittivo per il monitor.", "warning");
      setActiveTab("TARGET");
      return;
    }

    if (type === "HTTP") {
      if (!url.trim()) {
        showToast("Inserisci l'URL di destinazione per il monitor HTTP.", "warning");
        setActiveTab("TARGET");
        return;
      }
      try {
        new URL(url);
      } catch {
        showToast("L'URL inserito non è valido. Assicurati di includere http:// o https://.", "warning");
        setActiveTab("TARGET");
        return;
      }
    } else if (type === "PING") {
      if (!host?.trim()) {
        showToast("Inserisci l'hostname o indirizzo IP per il monitor PING.", "warning");
        setActiveTab("TARGET");
        return;
      }
    } else if (type === "HOST") {
      if (!url?.trim()) {
        showToast("Inserisci l'endpoint dell'agente per il monitor HOST.", "warning");
        setActiveTab("TARGET");
        return;
      }
    } else if (type === "HEARTBEAT") {
      if (!heartbeatToken?.trim()) {
        showToast("Il token per il monitor Heartbeat è obbligatorio.", "warning");
        setActiveTab("TARGET");
        return;
      }
    }

    setIsSaving(true);

    try {
      const probeConfiguration = buildProbeConfiguration();

      const dataExtractorPayload = (type !== "PING" && enableExtractor)
        ? {
            displayHint,
            maxRows: schemaType === "TABLE" ? maxRows : 10,
            pageSize: schemaType === "TABLE" ? pageSize : 10,
            retainHistory: displayHint === "SPARKLINE" ? true : retainHistory,
            schema: schemaType === "SINGLE_VALUE"
              ? {
                  type: "SINGLE_VALUE",
                  valuePath: singleValuePath,
                  label: singleValueLabel,
                  unit: singleValueUnit || undefined,
                  format: singleValueFormat,
                  decimalPlaces: singleValueDecimals,
                }
              : schemaType === "TABLE"
              ? {
                  type: "TABLE",
                  dataPath: tableDataPath,
                  columns: tableColumns.map(c => ({ path: c.path, label: c.label, format: c.format, decimalPlaces: c.decimalPlaces })),
                }
              : {
                  type: "KEY_VALUE_PAIRS",
                  pairs: keyValuePairs.map(p => ({ path: p.path, label: p.label, format: p.format, decimalPlaces: p.decimalPlaces })),
                }
          }
        : undefined;

      const payload = {
        name,
        type,
        probeConfiguration,
        schedule: { intervalSeconds },
        assertionRules: rules.map(r => ({
          target: r.target,
          operator: r.operator,
          value: r.value,
          property: r.property || r.path
        })),
        metricRules: (type !== "PING" && enableExtractor)
          ? metricRules.map(r => ({
              property: r.operator === "CUSTOM_SCRIPT" ? "" : r.property,
              operator: r.operator,
              value: r.operator === "CUSTOM_SCRIPT" ? "" : r.value,
              aggregation: r.aggregation || "NONE",
              script: r.operator === "CUSTOM_SCRIPT" ? r.script : undefined,
            }))
          : [],
        alarmPolicy: { consecutiveFailures },
        recipientIds,
        dataExtractor: dataExtractorPayload,
        status: editingMonitor ? editingMonitor.status : "UP",
      };

      if (editingMonitor) {
        await updateMonitorAction(editingMonitor.id, payload as any);
        showToast("Monitor aggiornato con successo.", "success");
      } else {
        await createMonitorAction(dashboardId, payload as any);
        showToast("Monitor creato con successo.", "success");
      }
      onSaved();
    } catch (err) {
      showToast("Errore nel salvataggio del monitor: " + (err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Test 1: Test di Connessione & Payload Grezzo (Tab Target)
  const handleTestConnection = async () => {
    setTestMode("CONNECTION");
    setIsTestModalOpen(true);
    setIsTesting(true);
    setTestResult(null);
    try {
      const probeConfiguration = buildProbeConfiguration();

      const payload = {
        type,
        probeConfiguration,
        assertionRules: rules.map(r => ({ target: r.target, operator: r.operator, value: r.value, property: r.property || r.path })),
      };

      const result = await testTargetAction(payload);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Errore sconosciuto" });
    } finally {
      setIsTesting(false);
    }
  };

  // Test 2: Test di Estrazione Dati & Mapping (Tab Estrazione)
  const handleTestExtraction = async () => {
    setTestMode("EXTRACTION");
    setIsTestModalOpen(true);
    setIsTesting(true);
    setTestResult(null);
    try {
      const probeConfiguration = buildProbeConfiguration();

      const dataExtractorPayload = (type !== "PING" && enableExtractor)
        ? {
            displayHint,
            maxRows: schemaType === "TABLE" ? maxRows : 10,
            pageSize: schemaType === "TABLE" ? pageSize : 10,
            retainHistory: displayHint === "SPARKLINE" ? true : retainHistory,
            schema: schemaType === "SINGLE_VALUE"
              ? { type: "SINGLE_VALUE", valuePath: singleValuePath, label: singleValueLabel, unit: singleValueUnit, format: singleValueFormat, decimalPlaces: singleValueDecimals }
              : schemaType === "TABLE"
              ? { type: "TABLE", dataPath: tableDataPath, columns: tableColumns }
              : { type: "KEY_VALUE_PAIRS", pairs: keyValuePairs }
          }
        : undefined;

      const payload = {
        type,
        probeConfiguration,
        assertionRules: rules.map(r => ({ target: r.target, operator: r.operator, value: r.value, property: r.property || r.path })),
        dataExtractor: dataExtractorPayload,
      };

      const result = await testTargetAction(payload);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Errore sconosciuto" });
    } finally {
      setIsTesting(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white flex items-center gap-2 select-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Torna indietro
        </button>
      </div>

      <div className="glass-panel p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-xl text-white font-bold mb-6">
          {editingMonitor ? `Modifica Monitor: ${editingMonitor.name}` : "Aggiungi Nuovo Monitor"}
        </h1>

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-neutral-800 mb-6 gap-1 overflow-x-auto select-none">
          {TAB_LIST.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-[hsl(var(--primary))] text-white bg-[hsl(var(--primary))/0.04]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[hsl(var(--primary))]" : "text-neutral-500"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    tab.badge === "Attivo"
                      ? "bg-[hsl(var(--success))/0.15] text-[hsl(var(--success))]"
                      : "bg-neutral-800 text-neutral-400"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {/* TAB 1: TARGET & RETE */}
          <div className={activeTab === "TARGET" ? "flex flex-col gap-6 animate-in fade-in duration-150" : "hidden"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="monitorName" className="form-label">Nome del Monitor</label>
                <input
                  id="monitorName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Sito Web Principale"
                  className="form-input"
                />
                <span className="text-[10px] text-neutral-500 mt-1">
                  Un nome descrittivo per identificare il servizio monitorato.
                </span>
              </div>

              <div className="form-group col-span-1">
                <label htmlFor="monitorType" className="form-label">Tipo Monitor</label>
                <div id="monitorType">
                  <SegmentedControl
                    value={type}
                    onChange={(val) => setType(val as any)}
                    options={[
                      { value: "HTTP", label: "HTTP/HTTPS" },
                      { value: "PING", label: "PING/TCP" },
                      { value: "HOST", label: "Host Resources" },
                      { value: "HEARTBEAT", label: "Heartbeat (Push)" },
                    ]}
                  />

                </div>
                <span className="text-[10px] text-neutral-500 mt-1">
                  Protocollo o sonda di interrogazione periodica.
                </span>
              </div>
            </div>

            <NetworkSettings state={state} dispatch={dispatch} />

            <div className="flex items-center justify-between bg-neutral-900/50 p-4 rounded-md border border-neutral-800">
              <div>
                <h4 className="text-xs font-semibold text-white">Verifica Immediata Rete</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Invia un controllo istantaneo per verificare raggiungibilità, codice HTTP e tempo di risposta.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="btn-secondary flex items-center gap-1.5 text-xs !py-2 !px-3 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current text-[hsl(var(--primary))]" />
                Test Connessione
              </button>
            </div>
          </div>

          {/* TAB 2: CRITERI DI UPTIME & SOGLIE */}
          <div className={activeTab === "ASSERTIONS" ? "flex flex-col gap-6 animate-in fade-in duration-150" : "hidden"}>
            <AssertionRules state={state} dispatch={dispatch} />

              <div className="border-t border-neutral-800 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  Politica di Scatto Allarme
                </h3>
                <div className="bg-[hsl(260_25%_4.5%)] p-4 border border-[hsl(var(--border-color))]/50 rounded-[var(--radius)] max-w-md">
                  <div className="form-group">
                    <label htmlFor="consecutiveFailures" className="form-label">
                      Check Falliti Consecutivi per Allarme
                    </label>
                    <input
                      id="consecutiveFailures"
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={consecutiveFailures}
                      onChange={(e) => setConsecutiveFailures(Number(e.target.value))}
                      className="form-input font-mono"
                    />
                    <span className="text-[11px] text-neutral-400 mt-2 block leading-relaxed">
                      Se il controllo fallisce per <strong>{consecutiveFailures}</strong> volt{consecutiveFailures === 1 ? 'a consecutiva' : 'e consecutive'}, lo stato passerà a <span className="text-[hsl(var(--error))] font-bold">DOWN</span> e verrà inviato un allarme.
                    </span>
                  </div>
                </div>
              </div>
            </div>

          {/* TAB 3: ESTRAZIONE DATI & METRICHE */}
          <div className={activeTab === "EXTRACTION" ? "flex flex-col gap-6 animate-in fade-in duration-150" : "hidden"}>
            {type === "PING" ? (
              <div className="glass-panel p-8 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
                <Database className="w-8 h-8 text-neutral-600" />
                <p className="text-sm font-medium text-white">Non applicabile per monitor PING</p>
                <p className="text-xs text-neutral-500">L'estrazione dati è disponibile per monitor di tipo HTTP e Host Resources.</p>
              </div>
            ) : (
              <>
                <AdvancedExtractors state={state} dispatch={dispatch} />

                {enableExtractor && (
                  <div className="flex items-center justify-between bg-neutral-900/50 p-4 rounded-md border border-neutral-800">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Collaudo Estrazione & Mappatura</h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Esegue la chiamata e mostra l'anteprima dei valori estratti secondo i JSON Path e formati configurati.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestExtraction}
                      disabled={isTesting}
                      className="btn-secondary flex items-center gap-1.5 text-xs !py-2 !px-3 shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-[hsl(var(--primary))]" />
                      Test Estrazione & Mapping
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* TAB 4: NOTIFICHE & DESTINATARI */}
          <div className={activeTab === "RECIPIENTS" ? "flex flex-col gap-6 animate-in fade-in duration-150" : "hidden"}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Destinatari Notifiche Allarmi
              </h3>
              <p className="text-xs text-neutral-400 mb-4">
                Seleziona i contatti e i canali (Email, Slack, Webhook) che riceveranno le notifiche quando questo monitor va DOWN o genera un allarme metrica.
              </p>

              {availableRecipients.length === 0 ? (
                <div className="glass-panel p-8 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
                  <Bell className="w-8 h-8 text-neutral-600" />
                  <p className="text-sm font-medium text-white">Nessun destinatario configurato</p>
                  <p className="text-xs text-neutral-500">
                    Puoi configurare i destinatari globali nella sezione "Destinatari" della dashboard.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableRecipients.map((r) => {
                    const isSelected = recipientIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-3 p-3.5 rounded-md border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[hsl(var(--primary)/0.08)] border-[hsl(var(--primary)/0.4)] text-white"
                            : "bg-neutral-900/40 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newRecipients = e.target.checked
                              ? [...recipientIds, r.id]
                              : recipientIds.filter((id) => id !== r.id);
                            dispatch({ type: "SET_FIELD", field: "recipientIds", value: newRecipients });
                          }}
                          className="w-4 h-4 rounded border-neutral-700 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] bg-neutral-800"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{r.name}</span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {r.email || (r.channels && r.channels.length > 0 ? r.channels.map(c => c.type).join(", ") : "Canale predefinito")}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer di Navigazione & Salvataggio */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-[hsl(var(--border-color))]/40 pt-5 mt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button type="button" onClick={onBack} className="btn-secondary !text-xs">
                Annulla
              </button>

              {currentTabIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(TAB_LIST[currentTabIndex - 1].id)}
                  className="btn-secondary !text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Precedente
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {currentTabIndex < TAB_LIST.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(TAB_LIST[currentTabIndex + 1].id)}
                  className="btn-secondary !text-xs flex items-center gap-1"
                >
                  Successivo <ChevronRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary !text-xs flex items-center gap-1.5 shadow-lg shadow-[hsl(var(--primary))/0.2]"
              >
                <Save className="w-4 h-4" /> {isSaving ? "Salvataggio..." : "Salva Monitor"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <TestTargetModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        isLoading={isTesting}
        result={testResult}
        testMode={testMode}
      />
    </div>
  );
};

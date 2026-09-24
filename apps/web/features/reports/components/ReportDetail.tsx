"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, Send, CheckCircle2 } from "lucide-react";
import { ReportDTO, MonitorDTO } from '@/core/ports/gateways';
import { useReportActions } from '../hooks/useReportActions';
import { useToast } from "@/shared/components/Toast";

interface ReportDetailProps {
  report: ReportDTO;
  allMonitors: MonitorDTO[];
  onBack: () => void;
  onRefresh: () => void;
}

export const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  allMonitors,
  onBack,
  onRefresh,
}) => {
  const { editReport, confirmReport, isSaving, isConfirming } = useReportActions(onRefresh);
  const { showToast } = useToast();
  
  // Custom Text Notes
  const [customText, setCustomText] = useState(report.customText || "");

  // Monitor inclusi (ID dei monitor da ESCLUDERE)
  const reportMonitors: any[] = report.content?.monitors || [];
  const [excludedMonitorIds, setExcludedMonitorIds] = useState<string[]>(() => {
    // Trova i monitor che sono presenti in allMonitors ma non nel report
    const includedIds = reportMonitors.map((rm) => rm.id);
    return allMonitors.filter((m) => !includedIds.includes(m.id)).map((m) => m.id);
  });

  const isDraft = report.status === "DRAFT";

  const handleToggleMonitor = (monitorId: string) => {
    if (!isDraft) return;
    if (excludedMonitorIds.includes(monitorId)) {
      setExcludedMonitorIds(excludedMonitorIds.filter((id) => id !== monitorId));
    } else {
      setExcludedMonitorIds([...excludedMonitorIds, monitorId]);
    }
  };

  const handleSaveModifications = async () => {
    const updated = await editReport(report.id, customText, excludedMonitorIds);
    if (updated) {
      showToast("Report salvato correttamente.", "success");
    }
  };

  const handleConfirmAndSend = async () => {
    if (!confirm("Confermi l'invio del report? Verranno inviate notifiche e-mail e Slack a tutti i destinatari configurati.")) return;
    // Prima salva eventuali modifiche pendenti
    const saved = await editReport(report.id, customText, excludedMonitorIds);
    if (!saved) return;
    // Poi conferma
    const confirmed = await confirmReport(report.id);
    if (confirmed) {
      onBack();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white flex items-center gap-2 select-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {"Torna all'elenco dei Report"}
        </button>
      </div>

      {/* Grid principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sinistra: Dettagli metriche (2 colonne) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel p-6">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <span className="text-neutral-500 font-mono text-xs uppercase block">Dettaglio Report</span>
                <h1 className="text-xl text-white font-bold mt-1">Uptime Report - {new Date(report.createdAt).toLocaleDateString()}</h1>
                <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                  {new Date(report.periodFrom).toLocaleString()} &rarr; {new Date(report.periodTo).toLocaleString()}
                </p>
              </div>
              <span className={`badge ${report.status === "SENT" ? "badge-up" : "badge-paused"} !py-1 !px-3`}>
                {report.status}
              </span>
            </div>

            {/* KPI aggregate del report */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 p-4 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius)]">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Uptime Medio</span>
                <span className="text-xl text-white font-bold font-mono">{report.content?.uptimePercent}%</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Risposta Media</span>
                <span className="text-xl text-white font-bold font-mono">{report.content?.avgResponseTimeMs} ms</span>
              </div>
              <div>
                <span className="text-[10px] text-[hsl(var(--warning))] uppercase tracking-wider block font-semibold">P95 Risposta</span>
                <span className="text-xl text-[hsl(var(--warning))] font-bold font-mono">{report.content?.p95ResponseTimeMs || '--'} ms</span>
              </div>
              <div>
                <span className="text-[10px] text-[hsl(var(--error))] uppercase tracking-wider block font-semibold">P99 Risposta</span>
                <span className="text-xl text-[hsl(var(--error))] font-bold font-mono">{report.content?.p99ResponseTimeMs || '--'} ms</span>
              </div>
            </div>
 
            {/* Tabella monitor inclusi */}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Monitors Inclusi nel Report
            </h3>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Monitor</th>
                  <th>Uptime Periodo</th>
                  <th>Risposta Media</th>
                  <th>Trend Latenza</th>
                  <th>P95 / P99</th>
                </tr>
              </thead>
              <tbody>
                {reportMonitors.map((mon, idx) => (
                  <tr key={idx}>
                    <td className="text-white font-medium">{mon.name}</td>
                    <td className="font-mono">{mon.uptimePercent}%</td>
                    <td className="font-mono text-white">{mon.avgResponseTimeMs} ms</td>
                    <td className="w-32">
                      {mon.timeSeries && mon.timeSeries.length > 1 ? (
                        <ReportSparkline data={mon.timeSeries.map((t: any) => t.value)} />
                      ) : (
                        <span className="text-[10px] text-neutral-600">N/D</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      <span className="text-[hsl(var(--warning))]">{mon.p95ResponseTimeMs || '--'}</span>
                      <span className="text-neutral-500 mx-1">/</span>
                      <span className="text-[hsl(var(--error))]">{mon.p99ResponseTimeMs || '--'}</span>
                    </td>
                  </tr>
                ))}
                {reportMonitors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-xs text-neutral-500 py-6">
                      Nessun monitor incluso in questo report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
 
        {/* Destra: Editor note e configurazione invio (1 colonna) */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
                Note & Integrazione
              </h3>
 
              {/* Textarea note */}
              <div className="form-group mb-4">
                <label className="form-label">Note Personalizzate (Custom Text)</label>
                <textarea
                  disabled={!isDraft}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Aggiungi osservazioni manuali da inviare via e-mail ai destinatari..."
                  rows={6}
                  className="form-input resize-none w-full !text-xs"
                />
              </div>
 
              {/* Lista monitor da includere/escludere */}
              {isDraft && (
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <label className="form-label block">Seleziona Monitor da Includere</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setExcludedMonitorIds([])}
                        className="text-[10px] text-[hsl(var(--primary))] hover:underline"
                      >
                        Tutti
                      </button>
                      <button 
                        onClick={() => setExcludedMonitorIds(allMonitors.map(m => m.id))}
                        className="text-[10px] text-neutral-500 hover:text-white hover:underline"
                      >
                        Nessuno
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {allMonitors.map((m) => {
                      const isExcluded = excludedMonitorIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-2.5 p-2 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)] text-xs cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => handleToggleMonitor(m.id)}
                            className="accent-[hsl(var(--primary))] h-3.5 w-3.5"
                          />
                          <span className={isExcluded ? "text-neutral-500 line-through" : "text-white"}>
                            {m.name} <span className="text-[9px] text-neutral-600 ml-1">({m.type})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
 
            {/* Actions */}
            {isDraft ? (
              <div className="flex flex-col gap-2.5 pt-4 border-t border-[hsl(var(--border-color))]/50 mt-4">
                <button
                  onClick={handleSaveModifications}
                  disabled={isSaving}
                  className="btn-secondary w-full text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> {isSaving ? "Salvataggio..." : "Salva Modifiche"}
                </button>
                <button
                  onClick={handleConfirmAndSend}
                  disabled={isConfirming}
                  className="btn-primary w-full text-black font-semibold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> {isConfirming ? "Invio in corso..." : "Conferma e Invia"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.15)] rounded-[var(--radius)] text-xs text-[hsl(var(--success))] mt-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Questo report è già stato confermato e inviato ai destinatari. Non è più modificabile.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportSparkline: React.FC<{ data: number[] }> = ({ data }) => {
  if (!data || data.length < 2) return null;
  const width = 100;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });
  const svgPath = `M ${points.join(" L ")}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <path
        d={svgPath}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

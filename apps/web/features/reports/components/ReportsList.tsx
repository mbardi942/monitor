"use client";

import React, { useState } from "react";
import { FileText, Calendar, Plus, ChevronRight } from "lucide-react";
import { ReportDTO } from '@/core/ports/gateways';
import { useReportActions } from '../hooks/useReportActions';

interface ReportsListProps {
  dashboardId: string;
  reports: ReportDTO[];
  onSelectReport: (report: ReportDTO) => void;
  onRefresh: () => void;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  dashboardId,
  reports,
  onSelectReport,
  onRefresh,
}) => {
  const { generateReport, isGenerating } = useReportActions(onRefresh);

  // Form Fields per nuovo report
  const [from, setFrom] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 16));

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const generated = await generateReport(
      dashboardId,
      new Date(from).toISOString(),
      new Date(to).toISOString()
    );
    if (generated) {
      onSelectReport(generated);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "badge-paused bg-neutral-900 border border-neutral-800 text-neutral-400";
      case "CONFIRMED":
        return "badge-up bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.2)]";
      case "SENT":
        return "badge-up";
      default:
        return "badge-paused";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sinistra: Form Generazione Manuale (1 colonna) */}
      <div className="flex flex-col gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[hsl(var(--primary))]" /> Genera Report Manuale
          </h3>
          
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className="filter-pill border border-[hsl(var(--border-color))]"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                setFrom(start.toISOString().slice(0, 16));
                setTo(now.toISOString().slice(0, 16));
              }}
            >
              Oggi
            </button>
            <button
              type="button"
              className="filter-pill border border-[hsl(var(--border-color))]"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                setFrom(start.toISOString().slice(0, 16));
                setTo(now.toISOString().slice(0, 16));
              }}
            >
              7 giorni
            </button>
            <button
              type="button"
              className="filter-pill border border-[hsl(var(--border-color))]"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                setFrom(start.toISOString().slice(0, 16));
                setTo(now.toISOString().slice(0, 16));
              }}
            >
              30 giorni
            </button>
          </div>

          <form onSubmit={handleGenerateReport} className="flex flex-col gap-4">
            <div className="form-group">
              <label htmlFor="reportFrom" className="form-label">Data Inizio</label>
              <input
                id="reportFrom"
                type="datetime-local"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reportTo" className="form-label">Data Fine</label>
              <input
                id="reportTo"
                type="datetime-local"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="form-input"
              />
            </div>
            <button
              type="submit"
              disabled={isGenerating}
              className="btn-primary w-full mt-2 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" /> {isGenerating ? "Generazione..." : "Genera Report"}
            </button>
          </form>
        </div>
      </div>

      {/* Destra: Storico Report (2 colonne) */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[hsl(var(--primary))]" /> Registro Report
          </h3>

          {reports.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-12">Nessun report presente in archivio.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 hover:border-[hsl(var(--primary)/0.35)] rounded-[var(--radius)] cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="icon-container group-hover:text-[hsl(var(--primary))] transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-semibold font-mono">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`badge ${getStatusBadge(report.status)} !px-2 !py-0.5 !text-[9px]`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                        Periodo: {new Date(report.periodFrom).toLocaleString()} → {new Date(report.periodTo).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[hsl(var(--border-color))]/50 sm:border-0 pt-3 sm:pt-0 mt-3 sm:mt-0">
                    <div className="flex gap-4 text-xs font-mono mr-4">
                      <div>
                        <span className="text-neutral-500 text-[10px] block uppercase">Uptime</span>
                        <span className="text-white font-semibold">{report.content?.uptimePercent}%</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[10px] block uppercase">Tempo Risposta</span>
                        <span className="text-white font-semibold">{report.content?.avgResponseTimeMs} ms</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-[hsl(var(--primary))] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

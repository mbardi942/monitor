import React from "react";
import { MonitorDTO } from '@/core/ports/gateways';
import { MonitorPresentation, isParamAlerted } from '../../lib/monitor-presentation';

interface MonitorCardBodyProps {
  monitor: MonitorDTO;
  presentation: MonitorPresentation;
}

export const MonitorCardBody: React.FC<MonitorCardBodyProps> = ({ monitor, presentation }) => {
  switch (presentation.kind) {
    case "REACHABILITY":
      return (
        <div className="flex gap-6 mb-5 mt-4 relative z-10">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Response Time</span>
            <span className="text-lg text-white font-semibold font-mono">
              {monitor.status === "PAUSED" || presentation.lastResponseTimeMs === undefined
                ? "--"
                : `${presentation.lastResponseTimeMs} ms`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Uptime</span>
            <span className="text-lg text-white font-semibold font-mono">
              {presentation.uptimePercentage}%
            </span>
          </div>
          {presentation.httpStatusCode !== undefined && (
            <div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">HTTP Status</span>
              <span className="text-lg text-white font-semibold font-mono">
                {presentation.httpStatusCode}
              </span>
            </div>
          )}
        </div>
      );

    case "METRIC_VALUE": {
      const { label, displayValue, unit } = presentation;

      return (
        <div className="mb-5 mt-3 relative z-10">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold mb-1 truncate max-w-[200px]" title={label}>
            {label}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl text-[hsl(var(--primary))] font-bold font-mono tracking-tight truncate max-w-[240px]" title={displayValue}>
              {displayValue}
            </span>
            {unit && <span className="text-xs text-neutral-400 font-medium">{unit}</span>}
          </div>
        </div>
      );
    }

    case "METRIC_GROUP": {
      const { pairs } = presentation;
      return (
        <div className="mb-5 mt-3 flex flex-col gap-3 max-h-[130px] overflow-y-auto pr-1 relative z-10">
          {pairs.length === 0 ? (
            <span className="text-xs text-neutral-500 italic">Nessun dato</span>
          ) : (
            pairs.map((p) => {
              const isPercent = p.displayValue.endsWith("%");
              const percentVal = isPercent ? parseFloat(p.displayValue) : null;
              const hasProgressBar = percentVal !== null && !isNaN(percentVal);
              const schema = monitor.dataExtractor?.schema;
              const pairsSchema = (schema?.type === "KEY_VALUE_PAIRS" ? schema.pairs : []) || [];
              const isAlerted = isParamAlerted(p.label, p.displayValue, monitor.metricRules || [], pairsSchema);

              return (
                <div key={p.label} className="flex flex-col gap-1 border-b border-neutral-800/40 pb-1.5 last:border-0">
                  <div className="flex justify-between items-center text-xs gap-4">
                    <span className={`truncate max-w-[120px] flex items-center gap-1 ${isAlerted ? "text-[hsl(var(--error))] font-semibold" : "text-neutral-400"}`} title={p.label}>
                      {isAlerted && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--error))] animate-pulse" />}
                      {p.label}
                    </span>
                    <span className={`font-mono font-semibold truncate max-w-[120px] ${isAlerted ? "text-[hsl(var(--error))] font-bold" : "text-white"}`} title={p.displayValue}>
                      {p.displayValue}
                    </span>
                  </div>
                  {hasProgressBar && (
                    <div className="w-full bg-[hsl(260_25%_4.5%)] h-1 rounded-[var(--radius-inner)] overflow-hidden mt-0.5 border border-neutral-800/20">
                      <div
                        className={`h-full rounded-l-[var(--radius-inner)] transition-all duration-300 ${
                          isAlerted
                            ? "bg-[hsl(var(--error))] animate-pulse"
                            : percentVal > 90
                            ? "bg-[hsl(var(--error))]"
                            : percentVal > 75
                            ? "bg-[hsl(var(--warning))]"
                            : "bg-[hsl(var(--primary))]"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, percentVal))}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      );
    }

    case "DATA_TABLE": {
      const { columns, rows } = presentation;
      const previewRows = rows.slice(0, 3);

      return (
        <div className="mb-5 mt-3 overflow-x-auto scrollbar-thin relative z-10">
          {rows.length === 0 ? (
            <span className="text-xs text-neutral-500 italic">Dati non disponibili</span>
          ) : (
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 font-semibold uppercase tracking-wider">
                  {columns.map((col) => (
                    <th key={col.label} className="pb-1 pr-2 truncate max-w-[80px]" title={col.label}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 text-neutral-300 font-mono">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-800/10">
                    {columns.map((col) => {
                      const val = row[col.label];
                      return (
                        <td key={col.label} className="py-1 pr-2 truncate max-w-[80px]" title={val !== undefined ? String(val) : ""}>
                          {val !== undefined ? String(val) : "--"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows.length > 3 && (
            <span className="text-[9px] text-neutral-500 italic mt-1 block">+{rows.length - 3} righe aggiuntive</span>
          )}
        </div>
      );
    }

    default:
      return null;
  }
};

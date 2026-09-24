import React from "react";
import { MonitorDTO } from '@/core/ports/gateways';
import { MonitorPresentation, isParamAlerted } from '../../lib/monitor-presentation';

interface MonitorListItemDetailsProps {
  monitor: MonitorDTO;
  presentation: MonitorPresentation;
}

export const MonitorListItemDetails: React.FC<MonitorListItemDetailsProps> = ({ monitor, presentation }) => {
  return (
    <div className="hidden md:flex flex-1 items-center gap-6 opacity-80 group-hover:opacity-100 transition-opacity">
      {presentation.kind === "REACHABILITY" && (
        <>
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500 uppercase">Response Time</span>
            <span className="text-xs font-mono text-neutral-300">{monitor.status === "PAUSED" || presentation.lastResponseTimeMs === undefined ? "--" : `${presentation.lastResponseTimeMs} ms`}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-500 uppercase">Uptime</span>
            <span className="text-xs font-mono text-neutral-300">{presentation.uptimePercentage}%</span>
          </div>
        </>
      )}

      {presentation.kind === "METRIC_VALUE" && (
        <div className="flex flex-col">
          <span className="text-[9px] text-neutral-500 uppercase truncate max-w-[120px]">{presentation.label}</span>
          <span className="text-xs font-mono text-neutral-300">
            {presentation.displayValue} {presentation.unit}
          </span>
        </div>
      )}

      {presentation.kind === "METRIC_GROUP" && presentation.pairs.length > 0 && (
        <div className="flex flex-col">
          <span className="text-[9px] text-neutral-500 uppercase">Metriche (Preview)</span>
          <div className="flex items-center gap-3">
            {presentation.pairs.slice(0, 2).map((p: any) => {
              const schema = monitor.dataExtractor?.schema;
              const pairsSchema = (schema?.type === "KEY_VALUE_PAIRS" ? schema.pairs : []) || [];
              const isAlerted = isParamAlerted(p.label, p.displayValue, monitor.metricRules || [], pairsSchema);
              return (
                <span key={p.label} className={`text-xs font-mono ${isAlerted ? "text-[hsl(var(--error))]" : "text-neutral-300"}`}>
                  {p.label}: {p.displayValue}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {presentation.kind === "DATA_TABLE" && (
        <div className="flex flex-col">
          <span className="text-[9px] text-neutral-500 uppercase">Record (Ultimo Check)</span>
          <span className="text-xs font-mono text-neutral-300">{presentation.rows.length} righe estratte</span>
        </div>
      )}
    </div>
  );
};

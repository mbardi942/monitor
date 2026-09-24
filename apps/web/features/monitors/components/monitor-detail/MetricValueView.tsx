import React from "react";
import { Activity } from "lucide-react";
import dynamic from "next/dynamic";
import { MonitorDTO } from '@/core/ports/gateways';

const MonitorChart = dynamic(() => import("../MonitorChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
      Caricamento grafico...
    </div>
  ),
});

interface MetricValueViewProps {
  monitor: MonitorDTO;
  presentation: any;
  chartTab: "metrics" | "latency";
  setChartTab: (tab: "metrics" | "latency") => void;
  latencyChartData: any[];
}

export const MetricValueView: React.FC<MetricValueViewProps> = ({
  monitor,
  presentation,
  chartTab,
  setChartTab,
  latencyChartData
}) => {
  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-[hsl(var(--border-color))]/50 pb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[hsl(var(--primary))]" /> 
          {chartTab === "metrics" ? `Andamento Metrica: ${presentation.label}` : "Tempo Risposta (Latenza)"}
        </h3>
        <div className="flex bg-[hsl(260_25%_4.5%)] p-1 rounded-[var(--radius-inner)] border border-[hsl(var(--border-color))]/50 select-none">
          <button
            onClick={() => setChartTab("metrics")}
            className={`px-3 py-1 rounded-[var(--radius-inner)] text-[11px] font-medium transition-all cursor-pointer ${
              chartTab === "metrics"
                ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            Metrica
          </button>
          <button
            onClick={() => setChartTab("latency")}
            className={`px-3 py-1 rounded-[var(--radius-inner)] text-[11px] font-medium transition-all cursor-pointer ${
              chartTab === "latency"
                ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] shadow-[0_0_12px_rgba(139,92,246,0.08)]"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            Latenza
          </button>
        </div>
      </div>

      {chartTab === "metrics" ? (
        presentation.showTrend ? (
          presentation.trendPoints.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
              Nessun dato storico registrato per la metrica.
            </div>
          ) : (
            <div className="h-64 w-full">
              <MonitorChart
                chartData={presentation.trendPoints}
                dataKey="value"
                unit={presentation.unit}
                label={presentation.label}
                referenceLines={(monitor.metricRules || [])
                  .filter((rule) => rule.property === presentation.label && rule.operator !== "CUSTOM_SCRIPT")
                  .map((rule) => ({
                    value: Number(rule.value),
                    label: `${rule.property} ${rule.operator} ${rule.value}`,
                    stroke: "hsl(var(--error))",
                  }))
                  .filter((r) => !isNaN(r.value))}
              />
            </div>
          )
        ) : (
          <div className="p-8 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius)] text-center">
            <span className="text-xs text-neutral-500 block">Storico non abilitato per questa metrica.</span>
            <span className="text-2xl text-[hsl(var(--primary))] font-bold mt-2 block">
              {presentation.displayValue} {presentation.unit}
            </span>
          </div>
        )
      ) : (
        latencyChartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
            Dati di latenza non disponibili.
          </div>
        ) : (
          <div className="h-64 w-full">
            <MonitorChart chartData={latencyChartData} />
          </div>
        )
      )}
    </div>
  );
};

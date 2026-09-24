import React from "react";
import { LayoutGrid } from "lucide-react";
import dynamic from "next/dynamic";
import { MonitorDTO } from '@/core/ports/gateways';
import { isParamAlerted } from '../../lib/monitor-presentation';

const MonitorChart = dynamic(() => import("../MonitorChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
      Caricamento grafico...
    </div>
  ),
});

interface MetricGroupViewProps {
  monitor: MonitorDTO;
  presentation: any;
  chartTab: "metrics" | "latency";
  setChartTab: (tab: "metrics" | "latency") => void;
  activeMetricKey: string | null;
  setActiveMetricKey: (key: string) => void;
  latencyChartData: any[];
}

export const MetricGroupView: React.FC<MetricGroupViewProps> = ({
  monitor,
  presentation,
  chartTab,
  setChartTab,
  activeMetricKey,
  setActiveMetricKey,
  latencyChartData
}) => {
  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-[hsl(var(--border-color))]/50 pb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-[hsl(var(--primary))]" /> 
          {chartTab === "metrics" ? "Metriche Host (Seleziona per il grafico)" : "Tempo Risposta (Latenza)"}
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
            Metriche
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
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap border-b border-neutral-800 pb-3">
            {presentation.pairs.map((pair: any) => {
              const schema = monitor.dataExtractor?.schema;
              const pairsSchema = (schema?.type === "KEY_VALUE_PAIRS" ? schema.pairs : []) || [];
              const isAlerted = isParamAlerted(pair.label, pair.displayValue, monitor.metricRules || [], pairsSchema);

              return (
                <button
                  key={pair.label}
                  onClick={() => setActiveMetricKey(pair.label)}
                  className={`px-3 py-1.5 rounded-[var(--radius-inner)] text-xs font-medium transition-all cursor-pointer relative ${
                    activeMetricKey === pair.label
                      ? isAlerted
                        ? "bg-[hsl(var(--error)/0.12)] text-[hsl(var(--error))] border border-[hsl(var(--error)/0.3)] shadow-[0_0_12px_rgba(239,68,68,0.1)]"
                        : "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.25)] shadow-[0_0_12px_rgba(139,92,246,0.1)]"
                      : isAlerted
                      ? "bg-[hsl(var(--error)/0.06)] hover:bg-[hsl(var(--error)/0.1)] border border-[hsl(var(--error)/0.15)] text-[hsl(var(--error))]/80 hover:text-[hsl(var(--error))]"
                      : "bg-[hsl(260_25%_4.5%)] hover:bg-neutral-800/10 border border-[hsl(var(--border-color))]/50 text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="block text-left text-[9px] uppercase text-neutral-500 tracking-wider font-semibold flex items-center gap-1">
                    {isAlerted && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--error))] animate-pulse" />}
                    {pair.label}
                  </span>
                  <span className="block font-mono font-bold text-sm text-left">
                    {pair.displayValue}
                  </span>
                </button>
              );
            })}
          </div>

          {activeMetricKey && (
            <div>
              <h4 className="text-[10px] uppercase font-semibold text-neutral-500 mb-4 tracking-wider">
                Andamento Temporale: {activeMetricKey}
              </h4>
              {(() => {
                const metricGroupChartData = (monitor.recentExecutions || [])
                  .filter((e) => e.extractedData?.values?.[activeMetricKey] !== undefined)
                  .map((e) => {
                    const val = Number(e.extractedData!.values![activeMetricKey]);
                    return {
                      time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                      value: val,
                    };
                  })
                  .filter((pt) => !isNaN(pt.value))
                  .reverse();

                const schema = monitor.dataExtractor?.schema;
                const selectedPairSchema = schema?.type === "KEY_VALUE_PAIRS" && schema.pairs
                  ? schema.pairs.find((p: any) => p.label === activeMetricKey)
                  : undefined;

                const format = selectedPairSchema?.format;
                const unit = format === "percentage" ? "%" : format === "currency" ? "€" : "";

                const activeMetricReferenceLines = (monitor.metricRules || [])
                  .filter((rule) => rule.property === activeMetricKey && rule.operator !== "CUSTOM_SCRIPT")
                  .map((rule) => ({
                    value: Number(rule.value),
                    label: `${rule.property} ${rule.operator} ${rule.value}`,
                    stroke: "hsl(var(--error))",
                  }))
                  .filter((r) => !isNaN(r.value));

                if (metricGroupChartData.length === 0) {
                  return (
                    <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
                      Nessun dato storico per questa metrica.
                    </div>
                  );
                }

                return (
                  <div className="h-64 w-full">
                    <MonitorChart
                      chartData={metricGroupChartData}
                      dataKey="value"
                      unit={unit}
                      label={activeMetricKey}
                      referenceLines={activeMetricReferenceLines}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
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

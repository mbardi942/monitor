import React from "react";
import { Activity } from "lucide-react";
import dynamic from "next/dynamic";

const MonitorChart = dynamic(() => import("../MonitorChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
      Caricamento grafico...
    </div>
  ),
});

interface ReachabilityViewProps {
  latencyChartData: any[];
}

export const ReachabilityView: React.FC<ReachabilityViewProps> = ({ latencyChartData }) => {
  return (
    <div className="glass-panel p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-[hsl(var(--primary))]" /> Response Time (Ultimi Check)
      </h3>
      {latencyChartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-neutral-500">
          Dati storici insufficienti. Esegui dei check per popolare il grafico.
        </div>
      ) : (
        <div className="h-64 w-full">
          <MonitorChart chartData={latencyChartData} />
        </div>
      )}
    </div>
  );
};

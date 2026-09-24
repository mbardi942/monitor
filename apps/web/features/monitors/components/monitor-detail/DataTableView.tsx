import React from "react";
import { Database } from "lucide-react";
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

interface DataTableViewProps {
  monitor: MonitorDTO;
  presentation: any;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  latencyChartData: any[];
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  monitor,
  presentation,
  currentPage,
  setCurrentPage,
  latencyChartData
}) => {
  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
        <Database className="w-4 h-4 text-[hsl(var(--primary))]" /> Tabella Dati Recente (Ultimo Check)
      </h3>

      {presentation.rows.length === 0 ? (
        <div className="text-xs text-neutral-500 italic text-center py-8">
          Dati tabulari non disponibili per l'ultimo check.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-[hsl(var(--border-color))]/50 rounded-[var(--radius)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--border-color))]/50 bg-[hsl(260_25%_4.5%)] text-neutral-400 font-semibold uppercase tracking-wider">
                  {presentation.columns.map((col: any) => (
                    <th key={col.label} className="p-3 truncate" style={{ minWidth: "120px" }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 text-neutral-300 font-mono">
                {(() => {
                  const itemsPerPage = monitor.dataExtractor?.pageSize || 10;
                  const currentRows = presentation.rows.slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  );
                  return currentRows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-800/10">
                      {presentation.columns.map((col: any) => {
                        const val = row[col.label];
                        return (
                          <td key={col.label} className="p-3 truncate" title={val !== undefined ? String(val) : ""}>
                            {val !== undefined ? String(val) : "--"}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Paginazione */}
          {(() => {
            const itemsPerPage = monitor.dataExtractor?.pageSize || 10;
            const totalPages = Math.ceil(presentation.rows.length / itemsPerPage);
            if (totalPages <= 1) return null;

            return (
              <div className="flex justify-between items-center text-xs mt-2">
                <span className="text-neutral-500">
                  Pagina {currentPage} di {totalPages} ({presentation.rows.length} righe totali)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((c) => c - 1)}
                    className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900"
                  >
                    Precedente
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((c) => c + 1)}
                    className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:hover:bg-neutral-900"
                  >
                    Successiva
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Grafico di Latenza di Rete / Tempo Risposta (secondario) per lo scenario DATA_TABLE */}
      <div className="border-t border-[hsl(var(--border-color))]/50 mt-2 pt-6">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-4">
          Tempo Risposta Check / Diagnostica Rete (ms)
        </h4>
        {latencyChartData.length === 0 ? (
          <div className="text-xs text-neutral-500 text-center py-6">Dati non disponibili</div>
        ) : (
          <div className="h-44 w-full">
            <MonitorChart chartData={latencyChartData} />
          </div>
        )}
      </div>
    </div>
  );
};

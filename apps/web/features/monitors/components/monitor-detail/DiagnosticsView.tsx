import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { MonitorDTO } from '@/core/ports/gateways';

interface DiagnosticsViewProps {
  monitor: MonitorDTO;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ monitor }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Regole di Asserzione */}
      <div className="glass-panel p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
          Regole di Validazione (Assertion Rules)
        </h3>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Operatore</th>
              <th>Valore Atteso</th>
              <th>Stato Ultimo Check</th>
            </tr>
          </thead>
          <tbody>
            {monitor.assertionRules && monitor.assertionRules.map((rule, idx) => {
              // Determina se l'asserzione è passata nel check recente
              const lastCheckExec = (monitor as any).recentExecutions?.[0];
              let rulePassed = true;
              if (lastCheckExec && lastCheckExec.assertionResults) {
                const matchedRes = lastCheckExec.assertionResults.find(
                  (r: any) => r.ruleTarget === rule.target && r.ruleOperator === rule.operator
                );
                if (matchedRes) {
                  rulePassed = matchedRes.passed;
                }
              }

              return (
                <tr key={idx}>
                  <td className="font-mono text-xs">{rule.target}</td>
                  <td>{rule.operator}</td>
                  <td className="font-mono text-xs text-white">{rule.value}</td>
                  <td>
                    {monitor.status === "PAUSED" ? (
                      <span className="text-neutral-500 text-xs">--</span>
                    ) : rulePassed ? (
                      <span className="text-[hsl(var(--success))] text-xs font-medium inline-flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Superata
                      </span>
                    ) : (
                      <span className="text-[hsl(var(--error))] text-xs font-medium inline-flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Fallita
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Regole Metriche (Metric Rules) */}
      {monitor.dataExtractor && (
        <div className="glass-panel p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
            Regole Metriche (Metric Rules)
          </h3>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Metrica / Proprietà</th>
                <th>Operatore</th>
                <th>Valore Atteso / Script</th>
                <th>Aggregazione</th>
                <th>Stato Ultimo Check</th>
              </tr>
            </thead>
            <tbody>
              {monitor.metricRules && monitor.metricRules.length > 0 ? (
                monitor.metricRules.map((rule, idx) => {
                  const isCustom = rule.operator === "CUSTOM_SCRIPT";
                  const lastCheckExec = (monitor as any).recentExecutions?.[0];
                  let rulePassed = true;
                  let hasResult = false;
                  if (lastCheckExec && lastCheckExec.extractedData && lastCheckExec.extractedData.values) {
                    const values = lastCheckExec.extractedData.values;
                    const propName = rule.property;
                    const extractedVal = values[propName];
                    if (extractedVal !== undefined) {
                      hasResult = true;
                      if (isCustom) {
                        rulePassed = monitor.dataHealthStatus !== "CRITICAL";
                      } else {
                        const expected = Number(rule.value);
                        const val = Number(extractedVal);
                        if (!isNaN(expected) && !isNaN(val)) {
                          if (rule.operator === "GREATER_THAN" && val <= expected) rulePassed = false;
                          if (rule.operator === "LESS_THAN" && val >= expected) rulePassed = false;
                          if (rule.operator === "EQUALS" && val !== expected) rulePassed = false;
                          if (rule.operator === "NOT_EQUALS" && val === expected) rulePassed = false;
                        }
                      }
                    }
                  }

                  return (
                    <tr key={idx}>
                      <td className="font-mono text-xs text-white">
                        {isCustom ? <span className="text-neutral-500 italic">Custom Script</span> : rule.property}
                      </td>
                      <td>{rule.operator}</td>
                      <td>
                        {isCustom ? (
                          <pre className="p-2 bg-neutral-950 border border-neutral-900 rounded font-mono text-[10px] text-neutral-300 max-w-[280px] overflow-x-auto whitespace-pre-wrap">
                            {rule.script}
                          </pre>
                        ) : (
                          <span className="font-mono text-xs text-white">{rule.value}</span>
                        )}
                      </td>
                      <td className="text-neutral-500 font-mono text-xs">{rule.aggregation || "NONE"}</td>
                      <td>
                        {monitor.status === "PAUSED" ? (
                          <span className="text-neutral-500 text-xs">--</span>
                        ) : hasResult ? (
                          rulePassed ? (
                            <span className="text-[hsl(var(--success))] text-xs font-medium inline-flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" /> Superata
                            </span>
                          ) : (
                            <span className="text-[hsl(var(--error))] text-xs font-medium inline-flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" /> Fallita
                            </span>
                          )
                        ) : (
                          <span className="text-neutral-500 text-xs italic">Nessun dato</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-neutral-500 italic">
                    Nessuna regola metrica configurata per questo monitor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

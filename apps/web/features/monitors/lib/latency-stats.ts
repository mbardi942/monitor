export interface ExecutionItem {
  timestamp: string;
  status: string;
  responseTimeMs: number;
  [key: string]: any;
}

export interface LatencyStats {
  totalChecks: number;
  successChecks: number;
  failedChecks: number;
  successRate: number;
  consecutiveFailures: number;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
}

/**
 * Calcola le metriche di latenza e affidabilità.
 * NOTA REGOLA DI DOMINIO: La latenza (media, min, max, P50, P95) viene calcolata
 * ESCLUSIVAMENTE sui check con esito "UP" e tempo di risposta valido.
 * 
 * @param executions Elenco delle esecuzioni (ordinato dal più recente al più vecchio)
 */
export function calculateLatencyStats(executions: ExecutionItem[] = []): LatencyStats {
  const totalChecks = executions.length;
  if (totalChecks === 0) {
    return {
      totalChecks: 0,
      successChecks: 0,
      failedChecks: 0,
      successRate: 100,
      consecutiveFailures: 0,
      avgLatencyMs: null,
      minLatencyMs: null,
      maxLatencyMs: null,
      p50LatencyMs: null,
      p95LatencyMs: null,
    };
  }

  // 1. Calcolo fallimenti consecutivi attuali (a partire dal check più recente all'indice 0)
  let consecutiveFailures = 0;
  for (const exec of executions) {
    if (exec.status !== "UP") {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  // 2. Filtra SOLO le esecuzioni con esito "UP"
  const upExecutions = executions.filter(
    (e) => e.status === "UP" && typeof e.responseTimeMs === "number" && !isNaN(e.responseTimeMs)
  );

  const successChecks = upExecutions.length;
  const failedChecks = totalChecks - successChecks;
  const successRate = Math.round((successChecks / totalChecks) * 100);

  if (upExecutions.length === 0) {
    return {
      totalChecks,
      successChecks: 0,
      failedChecks,
      successRate: 0,
      consecutiveFailures,
      avgLatencyMs: null,
      minLatencyMs: null,
      maxLatencyMs: null,
      p50LatencyMs: null,
      p95LatencyMs: null,
    };
  }

  // Tempi di risposta ordinati in ordine crescente per percentili
  const times = upExecutions.map((e) => e.responseTimeMs).sort((a, b) => a - b);
  const sum = times.reduce((acc, t) => acc + t, 0);
  const avgLatencyMs = Math.round(sum / times.length);
  const minLatencyMs = times[0];
  const maxLatencyMs = times[times.length - 1];

  // P50 (Mediana)
  const midIndex = Math.floor(times.length / 2);
  const p50LatencyMs =
    times.length % 2 !== 0
      ? times[midIndex]
      : Math.round((times[midIndex - 1] + times[midIndex]) / 2);

  // P95 (95° percentile)
  const p95Index = Math.min(times.length - 1, Math.max(0, Math.ceil(0.95 * times.length) - 1));
  const p95LatencyMs = times[p95Index];

  return {
    totalChecks,
    successChecks,
    failedChecks,
    successRate,
    consecutiveFailures,
    avgLatencyMs,
    minLatencyMs,
    maxLatencyMs,
    p50LatencyMs,
    p95LatencyMs,
  };
}

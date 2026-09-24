import { MonitorDTO, MetricRule } from "@/core/ports/gateways";

export type MonitorViewKind = "REACHABILITY" | "METRIC_VALUE" | "METRIC_GROUP" | "DATA_TABLE";

export interface ReachabilityPresentation {
  kind: "REACHABILITY";
  lastResponseTimeMs?: number;
  uptimePercentage: number;
  httpStatusCode?: number;
}

export interface MetricValuePresentation {
  kind: "METRIC_VALUE";
  label: string;
  displayValue: string;
  unit: string;
  latestValue?: number;
  trendPoints: { time: string; value: number }[];
  showTrend: boolean;
}

export interface MetricGroupPresentation {
  kind: "METRIC_GROUP";
  pairs: { label: string; displayValue: string }[];
}

export interface DataTablePresentation {
  kind: "DATA_TABLE";
  columns: { label: string; valuePath: string }[];
  rows: any[];
  totalRows: number;
}

export type MonitorPresentation =
  | ReachabilityPresentation
  | MetricValuePresentation
  | MetricGroupPresentation
  | DataTablePresentation;

export function formatValue(value: any, format?: string, decimalPlaces?: number): string {
  if (value === undefined || value === null) return "--";
  if (typeof value === "number" && !isNaN(value)) {
    const fractionDigits = decimalPlaces !== undefined ? { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces } : {};
    if (format === "currency") {
      return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", ...fractionDigits }).format(value);
    } else if (format === "percentage") {
      return new Intl.NumberFormat("it-IT", { style: "percent", ...fractionDigits }).format(value / 100);
    } else if (format === "number") {
      return new Intl.NumberFormat("it-IT", fractionDigits).format(value);
    }
  }
  return String(value);
}

export function getMonitorPresentation(monitor: MonitorDTO): MonitorPresentation {
  const executions = monitor.recentExecutions || [];
  const extractor = monitor.dataExtractor;
  const displayHint = extractor?.displayHint;
  const schema = extractor?.schema;

  // 1. Calcola Uptime (su un massimo di 30 check recenti)
  const totalChecks = executions.length;
  const successChecks = executions.filter((e) => e.status === "UP").length;
  const uptimePercentage = totalChecks === 0 ? 100 : Math.round((successChecks / totalChecks) * 100);

  // Se non c'è estrattore o l'hint è STATUS_BADGE, ricade su REACHABILITY
  if (!extractor || displayHint === "STATUS_BADGE" || !schema) {
    const lastCheck = executions[0];
    const statusCodeResult = lastCheck?.assertionResults?.find(
      (r: any) => r.ruleTarget === "STATUS_CODE"
    );
    const httpStatusCode = statusCodeResult ? Number(statusCodeResult.actualValue) : undefined;

    return {
      kind: "REACHABILITY",
      lastResponseTimeMs: monitor.lastResponseTimeMs,
      uptimePercentage,
      httpStatusCode,
    };
  }

  const latestExecution = executions[0];
  const extractedData = latestExecution?.extractedData || {};
  const values = extractedData.values || {};

  // 2. Scenario SINGLE_VALUE / SPARKLINE -> METRIC_VALUE
  if (displayHint === "SINGLE_VALUE" || displayHint === "SPARKLINE") {
    const label = (schema.type === "SINGLE_VALUE" ? schema.label : "Valore") || "Valore";
    const rawValue = values[label];
    const unit = (schema.type === "SINGLE_VALUE" ? schema.unit : "") || "";
    const format = schema.type === "SINGLE_VALUE" ? schema.format : undefined;
    const decimalPlaces = schema.type === "SINGLE_VALUE" ? schema.decimalPlaces : undefined;

    // Estrai lo storico per il trend
    const trendPoints = executions
      .filter((e) => e.extractedData?.values?.[label] !== undefined)
      .map((e) => {
        const date = new Date(e.timestamp);
        return {
          time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          value: Number(e.extractedData.values[label]),
        };
      })
      .filter((pt) => !isNaN(pt.value))
      .reverse(); // Ordine cronologico

    const showTrend = extractor.retainHistory || displayHint === "SPARKLINE";

    return {
      kind: "METRIC_VALUE",
      label,
      displayValue: formatValue(rawValue, format, decimalPlaces),
      unit,
      latestValue: rawValue !== undefined && rawValue !== null ? Number(rawValue) : undefined,
      trendPoints,
      showTrend,
    };
  }

  // 3. Scenario KEY_VALUE_LIST / KEY_VALUE_PAIRS -> METRIC_GROUP
  if (displayHint === "KEY_VALUE_LIST" || schema.type === "KEY_VALUE_PAIRS") {
    const pairsSchema = (schema.type === "KEY_VALUE_PAIRS" ? schema.pairs : []) || [];
    const pairs = pairsSchema.map((p) => {
      const val = values[p.label];
      return {
        label: p.label,
        displayValue: formatValue(val, p.format, p.decimalPlaces),
      };
    });

    return {
      kind: "METRIC_GROUP",
      pairs,
    };
  }

  // 4. Scenario TABLE -> DATA_TABLE
  if (displayHint === "TABLE" || schema.type === "TABLE") {
    const columns = (schema.type === "TABLE" ? schema.columns : []) || [];
    const rows = extractedData.rows || [];

    return {
      kind: "DATA_TABLE",
      columns,
      rows,
      totalRows: rows.length,
    };
  }

  // Fallback sicuro a REACHABILITY
  return {
    kind: "REACHABILITY",
    lastResponseTimeMs: monitor.lastResponseTimeMs,
    uptimePercentage,
  };
}

export function isParamAlerted(
  label: string,
  displayValue: string,
  rules: MetricRule[],
  pairsSchema: any[]
): boolean {
  const pairDef = pairsSchema.find((ps) => ps.label.toLowerCase() === label.toLowerCase());
  const valuePath = pairDef?.path || pairDef?.valuePath || "";

  const rule = rules.find((r) => {
    const propLower = r.property.toLowerCase();
    const labelLower = label.toLowerCase();
    const pathLower = valuePath.toLowerCase();

    return (
      propLower === labelLower ||
      (pathLower && propLower === pathLower) ||
      (pathLower && pathLower.endsWith("." + propLower)) ||
      (pathLower && propLower.endsWith("." + labelLower))
    );
  });

  if (!rule) return false;

  const cleanValStr = displayValue.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const numVal = parseFloat(cleanValStr);
  const targetVal = parseFloat(rule.value);
  if (isNaN(numVal) || isNaN(targetVal)) return false;

  switch (rule.operator) {
    case "GREATER_THAN":
      return numVal > targetVal;
    case "LESS_THAN":
      return numVal < targetVal;
    case "EQUALS":
      return Math.abs(numVal - targetVal) < 0.0001;
    case "NOT_EQUALS":
      return Math.abs(numVal - targetVal) >= 0.0001;
    default:
      return false;
  }
}

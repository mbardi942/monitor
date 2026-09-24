import { MonitorDTO } from "@/core/ports/gateways";
import { MonitorFormState, MonitorFormAction, RuleItem } from "./types";

export const defaultRules: RuleItem[] = [
  { target: "STATUS_CODE", operator: "EQUALS", value: "200" },
  { target: "RESPONSE_TIME", operator: "LESS_THAN", value: "1000" },
];

export function initMonitorFormState(editingMonitor?: MonitorDTO): MonitorFormState {
  return {
    name: editingMonitor?.name || "",
    type: (editingMonitor?.type as any) || "HTTP",
    url: editingMonitor?.probeConfiguration?.url || "https://",
    method: editingMonitor?.probeConfiguration?.method || "GET",
    headers: editingMonitor?.probeConfiguration?.headers
      ? Object.entries(editingMonitor.probeConfiguration.headers).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [],
    authProfileId: editingMonitor?.probeConfiguration?.authProfileId || "",
    body: editingMonitor?.probeConfiguration?.body || "",
    timeoutMs: editingMonitor?.probeConfiguration?.timeoutMs || 5000,
    host: editingMonitor?.probeConfiguration?.host || "",
    port: editingMonitor?.probeConfiguration?.port || 80,
    token: editingMonitor?.probeConfiguration?.token || "",
    heartbeatToken:
      editingMonitor?.probeConfiguration?.heartbeatToken ||
      `hb_sec_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 8)}`,
    expectedIntervalSeconds: editingMonitor?.probeConfiguration?.expectedIntervalSeconds || 3600,
    gracePeriodSeconds: editingMonitor?.probeConfiguration?.gracePeriodSeconds ?? 300,
    intervalSeconds: editingMonitor?.schedule?.intervalSeconds || 60,
    rules: editingMonitor?.assertionRules && editingMonitor.assertionRules.length > 0
      ? (editingMonitor.assertionRules as any[])
      : defaultRules,

    consecutiveFailures: editingMonitor?.alarmPolicy?.consecutiveFailures || 3,
    metricRules: editingMonitor?.metricRules && editingMonitor.metricRules.length > 0
      ? (editingMonitor.metricRules as any[])
      : [],
    recipientIds: editingMonitor?.recipientIds || [],
    enableExtractor: !!editingMonitor?.dataExtractor,
    displayHint: editingMonitor?.dataExtractor?.displayHint || "STATUS_BADGE",
    maxRows: editingMonitor?.dataExtractor?.maxRows || 1000,
    pageSize: editingMonitor?.dataExtractor?.pageSize || 10,
    retainHistory: editingMonitor?.dataExtractor?.retainHistory || false,
    schemaType: (editingMonitor?.dataExtractor?.schema?.type as any) || "SINGLE_VALUE",
    singleValuePath: editingMonitor?.dataExtractor?.schema?.type === "SINGLE_VALUE"
      ? editingMonitor.dataExtractor.schema.valuePath || ""
      : "",
    singleValueLabel: editingMonitor?.dataExtractor?.schema?.type === "SINGLE_VALUE"
      ? editingMonitor.dataExtractor.schema.label || ""
      : "",
    singleValueUnit: editingMonitor?.dataExtractor?.schema?.type === "SINGLE_VALUE"
      ? editingMonitor.dataExtractor.schema.unit || ""
      : "",
    singleValueFormat: editingMonitor?.dataExtractor?.schema?.type === "SINGLE_VALUE"
      ? (editingMonitor.dataExtractor.schema.format as any) || "text"
      : "text",
    singleValueDecimals: editingMonitor?.dataExtractor?.schema?.type === "SINGLE_VALUE"
      ? editingMonitor.dataExtractor.schema.decimalPlaces
      : undefined,
    tableDataPath: editingMonitor?.dataExtractor?.schema?.type === "TABLE"
      ? editingMonitor.dataExtractor.schema.dataPath || ""
      : "",
    tableColumns: editingMonitor?.dataExtractor?.schema?.type === "TABLE"
      ? (editingMonitor.dataExtractor.schema.columns as any[]) || []
      : [],
    keyValuePairs: editingMonitor?.dataExtractor?.schema?.type === "KEY_VALUE_PAIRS"
      ? (editingMonitor.dataExtractor.schema.pairs as any[]) || []
      : [],
  };
}

export const monitorFormReducer = (state: MonitorFormState, action: MonitorFormAction): MonitorFormState => {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        [action.field]: action.value,
      };
    case "SET_SCHEMA_TYPE": {
      const schemaType = action.value;
      let displayHint = state.displayHint;
      if (schemaType === "TABLE") {
        if (displayHint !== "TABLE" && displayHint !== "STATUS_BADGE" && displayHint !== "KEY_VALUE_LIST") {
          displayHint = "TABLE";
        }
      } else if (schemaType === "KEY_VALUE_PAIRS") {
        if (displayHint !== "KEY_VALUE_LIST" && displayHint !== "STATUS_BADGE") {
          displayHint = "KEY_VALUE_LIST";
        }
      } else if (schemaType === "SINGLE_VALUE") {
        if (displayHint !== "SINGLE_VALUE" && displayHint !== "STATUS_BADGE" && displayHint !== "SPARKLINE") {
          displayHint = "SINGLE_VALUE";
        }
      }
      return {
        ...state,
        schemaType,
        displayHint,
      };
    }
    case "SET_DISPLAY_HINT": {
      const displayHint = action.value;
      const retainHistory = displayHint === "SPARKLINE" ? true : state.retainHistory;
      return {
        ...state,
        displayHint,
        retainHistory,
      };
    }
    case "ADD_HEADER":
      return {
        ...state,
        headers: [...state.headers, { key: action.key || "", value: action.value || "" }],
      };
    case "REMOVE_HEADER":
      return {
        ...state,
        headers: state.headers.filter((_, idx) => idx !== action.index),
      };
    case "SET_HEADER_FIELD": {
      const headers = [...state.headers];
      headers[action.index] = {
        ...headers[action.index],
        [action.field]: action.value,
      };
      return {
        ...state,
        headers,
      };
    }
    case "ADD_RULE":
      return {
        ...state,
        rules: [...state.rules, { target: "STATUS_CODE", operator: "EQUALS", value: "" }],
      };
    case "REMOVE_RULE":
      return {
        ...state,
        rules: state.rules.filter((_, idx) => idx !== action.index),
      };
    case "SET_RULE_FIELD": {
      const rules = [...state.rules];
      if (action.field === "target") {
        rules[action.index] = {
          ...rules[action.index],
          target: action.value as any,
        };
        if (action.value === "STATUS_CODE") {
          rules[action.index].operator = "EQUALS";
          rules[action.index].value = "200";
        } else if (action.value === "RESPONSE_TIME") {
          rules[action.index].operator = "LESS_THAN";
          rules[action.index].value = "1000";
        } else {
          rules[action.index].operator = "CONTAINS";
          rules[action.index].value = "";
        }
      } else {
        (rules[action.index] as any)[action.field] = action.value;
      }
      return {
        ...state,
        rules,
      };
    }
    case "ADD_METRIC_RULE":
      return {
        ...state,
        metricRules: [
          ...state.metricRules,
          { property: "", operator: "EQUALS", value: "", aggregation: "NONE", script: "" },
        ],
      };
    case "REMOVE_METRIC_RULE":
      return {
        ...state,
        metricRules: state.metricRules.filter((_, idx) => idx !== action.index),
      };
    case "SET_METRIC_RULE_FIELD": {
      const metricRules = [...state.metricRules];
      (metricRules[action.index] as any)[action.field] = action.value;
      return {
        ...state,
        metricRules,
      };
    }
    case "ADD_COLUMN":
      return {
        ...state,
        tableColumns: [...state.tableColumns, { path: "", label: "", format: "text" }],
      };
    case "REMOVE_COLUMN":
      return {
        ...state,
        tableColumns: state.tableColumns.filter((_, idx) => idx !== action.index),
      };
    case "SET_COLUMN_FIELD": {
      const tableColumns = [...state.tableColumns];
      (tableColumns[action.index] as any)[action.field] = action.value;
      return {
        ...state,
        tableColumns,
      };
    }
    case "ADD_KEY_VALUE_PAIR":
      return {
        ...state,
        keyValuePairs: [...state.keyValuePairs, { path: "", label: "", format: "text" }],
      };
    case "REMOVE_KEY_VALUE_PAIR":
      return {
        ...state,
        keyValuePairs: state.keyValuePairs.filter((_, idx) => idx !== action.index),
      };
    case "SET_KEY_VALUE_PAIR_FIELD": {
      const keyValuePairs = [...state.keyValuePairs];
      (keyValuePairs[action.index] as any)[action.field] = action.value;
      return {
        ...state,
        keyValuePairs,
      };
    }
    case "RESET_ADVANCED":
      return {
        ...state,
        enableExtractor: false,
        metricRules: [],
        displayHint: "STATUS_BADGE",
        schemaType: "SINGLE_VALUE",
        singleValuePath: "",
        singleValueLabel: "",
        singleValueUnit: "",
        singleValueFormat: "text",
        tableDataPath: "",
        tableColumns: [],
        keyValuePairs: [],
      };
    default:
      return state;
  }
};

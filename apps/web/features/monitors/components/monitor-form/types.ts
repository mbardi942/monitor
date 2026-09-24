export interface RuleItem {
  target: "STATUS_CODE" | "RESPONSE_TIME" | "JSON_BODY";
  operator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS";
  value: string;
  property?: string;
  path?: string;
}

export type DisplayHint =
  | "STATUS_BADGE"
  | "SINGLE_VALUE"
  | "TABLE"
  | "KEY_VALUE_LIST"
  | "SPARKLINE"
  | "KEY_VALUE_PAIRS"
  | "SERIES";

export interface ColumnDefinition {
  path: string;
  label: string;
  format?: "number" | "currency" | "percentage" | "text";
  decimalPlaces?: number;
}

export interface KeyValuePairDefinition {
  path: string;
  label: string;
  format?: "number" | "currency" | "percentage" | "text";
  decimalPlaces?: number;
}

export interface HeaderItem {
  key: string;
  value: string;
}

export interface MonitorFormState {
  name: string;
  type: "HTTP" | "PING" | "HOST" | "HEARTBEAT";
  url: string;
  method: string;
  headers: HeaderItem[];
  authProfileId?: string;
  body: string;
  timeoutMs: number;
  host: string;
  port: number;
  token: string;
  heartbeatToken: string;
  expectedIntervalSeconds: number;
  gracePeriodSeconds: number;
  intervalSeconds: number;
  rules: RuleItem[];
  consecutiveFailures: number;
  metricRules: any[];
  recipientIds: string[];
  enableExtractor: boolean;
  displayHint: DisplayHint;
  maxRows: number;
  pageSize: number;
  retainHistory: boolean;
  schemaType: "SINGLE_VALUE" | "TABLE" | "KEY_VALUE_PAIRS" | "SERIES";
  singleValuePath: string;
  singleValueLabel: string;
  singleValueUnit: string;
  singleValueFormat: "number" | "currency" | "percentage" | "text";
  singleValueDecimals?: number;
  tableDataPath: string;
  tableColumns: ColumnDefinition[];
  keyValuePairs: KeyValuePairDefinition[];
}


export type MonitorFormAction =
  | { type: "SET_FIELD"; field: keyof MonitorFormState; value: any }
  | { type: "SET_SCHEMA_TYPE"; value: MonitorFormState["schemaType"] }
  | { type: "SET_DISPLAY_HINT"; value: DisplayHint }
  | { type: "ADD_HEADER"; key?: string; value?: string }
  | { type: "REMOVE_HEADER"; index: number }
  | { type: "SET_HEADER_FIELD"; index: number; field: "key" | "value"; value: string }
  | { type: "ADD_RULE" }
  | { type: "REMOVE_RULE"; index: number }
  | { type: "SET_RULE_FIELD"; index: number; field: keyof RuleItem; value: string }
  | { type: "ADD_METRIC_RULE" }
  | { type: "REMOVE_METRIC_RULE"; index: number }
  | { type: "SET_METRIC_RULE_FIELD"; index: number; field: string; value: string }
  | { type: "ADD_COLUMN" }
  | { type: "REMOVE_COLUMN"; index: number }
  | { type: "SET_COLUMN_FIELD"; index: number; field: keyof ColumnDefinition; value: string }
  | { type: "ADD_KEY_VALUE_PAIR" }
  | { type: "REMOVE_KEY_VALUE_PAIR"; index: number }
  | { type: "SET_KEY_VALUE_PAIR_FIELD"; index: number; field: keyof KeyValuePairDefinition; value: string }
  | { type: "RESET_ADVANCED" };


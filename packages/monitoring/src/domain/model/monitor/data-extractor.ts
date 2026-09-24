import { ValueObject } from "@monitor/shared-kernel";

export type DisplayHint =
  | "STATUS_BADGE"
  | "SINGLE_VALUE"
  | "TABLE"
  | "KEY_VALUE_LIST"
  | "SPARKLINE";

export type ExtractionType = "SINGLE_VALUE" | "TABLE" | "KEY_VALUE_PAIRS";

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

export type ExtractionSchema =
  | {
      type: "SINGLE_VALUE";
      valuePath: string;
      label: string;
      unit?: string;
      format?: "number" | "currency" | "percentage" | "text";
      decimalPlaces?: number;
    }
  | {
      type: "TABLE";
      dataPath?: string;
      columns: ColumnDefinition[];
    }
  | {
      type: "KEY_VALUE_PAIRS";
      pairs: KeyValuePairDefinition[];
    };

export interface DataExtractorProps {
  schema: ExtractionSchema;
  displayHint: DisplayHint;
  maxRows: number;
  pageSize: number;
  retainHistory: boolean;
}

export class DataExtractor extends ValueObject<DataExtractorProps> {
  public get schema(): ExtractionSchema {
    return this.props.schema;
  }

  public get displayHint(): DisplayHint {
    return this.props.displayHint;
  }

  public get maxRows(): number {
    return this.props.maxRows;
  }

  public get pageSize(): number {
    return this.props.pageSize;
  }

  public get retainHistory(): boolean {
    return this.props.retainHistory;
  }

  public static create(props: Partial<DataExtractorProps> & { schema: ExtractionSchema; displayHint: DisplayHint }): DataExtractor {
    if (!props.schema) {
      throw new Error("Extraction schema is required.");
    }
    if (!props.displayHint) {
      throw new Error("Display hint is required.");
    }

    const maxRows = props.maxRows ?? 1000;
    const pageSize = props.pageSize ?? 10;
    const retainHistory = props.retainHistory ?? false;

    if (maxRows <= 0) {
      throw new Error("maxRows must be greater than 0");
    }
    if (pageSize <= 0) {
      throw new Error("pageSize must be greater than 0");
    }
    if (props.schema.type === "TABLE" && pageSize > maxRows) {
      throw new Error("pageSize cannot be greater than maxRows for a TABLE schema");
    }

    // Validation for display hints
    if (props.displayHint === "SPARKLINE" && !retainHistory) {
      throw new Error("retainHistory must be true when displayHint is SPARKLINE");
    }

    // Validate schema fields
    if (props.schema.type === "SINGLE_VALUE") {
      if (!props.schema.valuePath || props.schema.valuePath.trim() === "") {
        throw new Error("valuePath is required for SINGLE_VALUE schema");
      }
      if (!props.schema.label || props.schema.label.trim() === "") {
        throw new Error("label is required for SINGLE_VALUE schema");
      }
    } else if (props.schema.type === "TABLE") {
      if (props.schema.dataPath === undefined || props.schema.dataPath === null) {
        props.schema.dataPath = "";
      }
      if (!props.schema.columns || props.schema.columns.length === 0) {
        throw new Error("columns are required for TABLE schema");
      }
      for (const col of props.schema.columns) {
        if (!col.path || col.path.trim() === "") {
          throw new Error("column path is required");
        }
        if (!col.label || col.label.trim() === "") {
          throw new Error("column label is required");
        }
      }
    } else if (props.schema.type === "KEY_VALUE_PAIRS") {
      if (!props.schema.pairs || props.schema.pairs.length === 0) {
        throw new Error("pairs are required for KEY_VALUE_PAIRS schema");
      }
      for (const pair of props.schema.pairs) {
        if (!pair.path || pair.path.trim() === "") {
          throw new Error("pair path is required");
        }
        if (!pair.label || pair.label.trim() === "") {
          throw new Error("pair label is required");
        }
      }
    }

    return new DataExtractor({
      schema: props.schema,
      displayHint: props.displayHint,
      maxRows,
      pageSize,
      retainHistory,
    });
  }
}

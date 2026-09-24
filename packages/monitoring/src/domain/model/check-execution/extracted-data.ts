import { ValueObject } from "@monitor/shared-kernel";

export type ExtractionType = "SINGLE_VALUE" | "TABLE" | "KEY_VALUE_PAIRS";

export interface ExtractedDataProps {
  extractionType: ExtractionType;
  values: Record<string, any>;
  rows?: Record<string, any>[]; // Specific for TABLE type
  extractedAt: Date;
}

export class ExtractedData extends ValueObject<ExtractedDataProps> {
  public get extractionType(): ExtractionType {
    return this.props.extractionType;
  }

  public get values(): Record<string, any> {
    return { ...this.props.values };
  }

  public get rows(): Record<string, any>[] | undefined {
    return this.props.rows ? [...this.props.rows] : undefined;
  }

  public get extractedAt(): Date {
    return this.props.extractedAt;
  }

  /**
   * Preserves backward compatibility for calls with just a Record of values.
   */
  public static create(values: Record<string, any>): ExtractedData {
    return new ExtractedData({
      extractionType: "SINGLE_VALUE",
      values: values || {},
      extractedAt: new Date(),
    });
  }

  /**
   * Creates a detailed ExtractedData object with all metadata.
   */
  public static createDetailed(props: ExtractedDataProps): ExtractedData {
    if (!props.extractionType) {
      throw new Error("Extraction type is required.");
    }
    if (!props.extractedAt) {
      throw new Error("Extraction timestamp is required.");
    }
    return new ExtractedData({
      extractionType: props.extractionType,
      values: props.values || {},
      rows: props.rows,
      extractedAt: props.extractedAt,
    });
  }

  public static createEmpty(): ExtractedData {
    return new ExtractedData({
      extractionType: "SINGLE_VALUE",
      values: {},
      extractedAt: new Date(),
    });
  }
}

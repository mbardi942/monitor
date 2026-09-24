import { CheckResult } from "../model/check-execution/check-result.js";
import { DataExtractor } from "../model/monitor/data-extractor.js";
import { ExtractedData } from "../model/check-execution/extracted-data.js";

export class DataExtractionService {
  /**
   * Estrae i dati dal risultato del check in base alla configurazione dell'estrattore.
   */
  public extract(checkResult: CheckResult, extractor: DataExtractor): ExtractedData {
    if (!checkResult.body) {
      return ExtractedData.createEmpty();
    }

    let bodyObj: any;
    try {
      bodyObj = JSON.parse(checkResult.body);
    } catch {
      // Se il corpo non è JSON valido, ritorniamo un ExtractedData vuoto
      return ExtractedData.createEmpty();
    }

    const schema = extractor.schema;
    const extractedAt = new Date();

    switch (schema.type) {
      case "SINGLE_VALUE": {
        const val = this.getNestedValue(bodyObj, schema.valuePath);
        const key = schema.label;
        return ExtractedData.createDetailed({
          extractionType: "SINGLE_VALUE",
          values: { [key]: val },
          extractedAt,
        });
      }

      case "TABLE": {
        const dataArray = this.getNestedValue(bodyObj, schema.dataPath || "");
        if (!Array.isArray(dataArray)) {
          return ExtractedData.createDetailed({
            extractionType: "TABLE",
            values: {},
            rows: [],
            extractedAt,
          });
        }

        // Limitiamo le righe estratte a maxRows per motivi di performance
        const limitedArray = dataArray.slice(0, extractor.maxRows);
        const rows = limitedArray.map((item) => {
          const rowObj: Record<string, any> = {};
          for (const col of schema.columns) {
            rowObj[col.label] = this.getNestedValue(item, col.path);
          }
          return rowObj;
        });

        return ExtractedData.createDetailed({
          extractionType: "TABLE",
          values: {},
          rows,
          extractedAt,
        });
      }

      case "KEY_VALUE_PAIRS": {
        const values: Record<string, any> = {};
        for (const pair of schema.pairs) {
          values[pair.label] = this.getNestedValue(bodyObj, pair.path);
        }
        return ExtractedData.createDetailed({
          extractionType: "KEY_VALUE_PAIRS",
          values,
          extractedAt,
        });
      }

      default:
        return ExtractedData.createEmpty();
    }
  }

  /**
   * Helper per estrarre valori annidati da un oggetto JSON utilizzando dot notation.
   */
  private getNestedValue(obj: any, path: string): any {
    if (obj === null || obj === undefined) return undefined;
    if (path === "" || path === "$") return obj;

    // Converte items[0] in items.0
    const cleanPath = path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
    const parts = cleanPath.split(".");

    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }
}

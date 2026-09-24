import { MetricRule } from "../model/monitor/metric-rule.js";
import { MetricResult } from "../model/check-execution/metric-result.js";
import { ExtractedData } from "../model/check-execution/extracted-data.js";
import { ScriptEvaluator } from "../ports/script-evaluator.js";

export class MetricEvaluationEngine {
  constructor(private readonly scriptEvaluator?: ScriptEvaluator) {}

  /**
   * Valuta un set di MetricRule a fronte dei dati estratti (ExtractedData)
   */
  public async evaluate(rules: MetricRule[], data: ExtractedData): Promise<MetricResult[]> {
    const results: MetricResult[] = [];

    for (const rule of rules) {
      // 1. Caso Script Personalizzato
      if (rule.isCustomScript) {
        if (!this.scriptEvaluator) {
          results.push(
            MetricResult.createFailed(
              rule,
              "N/A",
              "Script evaluator is not configured in the engine."
            )
          );
          continue;
        }

        try {
          const scriptContext = {
            data: data.values,
            rows: data.rows ?? [],
          };
          const scriptResult = await this.scriptEvaluator.evaluate(rule.script!, scriptContext);
          
          if (scriptResult === true) {
            results.push(MetricResult.createPassed(rule, "true"));
          } else {
            results.push(
              MetricResult.createFailed(
                rule,
                String(scriptResult),
                `Custom script evaluated to falsy value: ${scriptResult}`
              )
            );
          }
        } catch (err: any) {
          results.push(
            MetricResult.createFailed(
              rule,
              "ERROR",
              `Custom script evaluation failed: ${err.message}`
            )
          );
        }
        continue;
      }

      // 2. Caso Regola Standard
      let actualValue: any;

      try {
        if (rule.aggregation && rule.aggregation !== "NONE" && data.rows && data.rows.length > 0) {
          // Valutazione aggregata su tabella (rows)
          actualValue = this.evaluateAggregation(rule.aggregation, rule.property, data.rows);
        } else {
          // Valutazione puntuale sul singolo valore
          actualValue = this.getNestedValue(data.values, rule.property);
        }
      } catch (err: any) {
        results.push(
          MetricResult.createFailed(
            rule,
            "N/A",
            `Error extracting value for rule: ${err.message}`
          )
        );
        continue;
      }

      if (actualValue === undefined || actualValue === null) {
        results.push(
          MetricResult.createFailed(
            rule,
            "undefined",
            `Property '${rule.property}' was not found in the extracted data.`
          )
        );
        continue;
      }

      const passed = this.evaluateOperator(String(actualValue), rule.operator, rule.value);
      if (passed) {
        results.push(MetricResult.createPassed(rule, String(actualValue)));
      } else {
        results.push(
          MetricResult.createFailed(
            rule,
            String(actualValue),
            `Validation failed: expected ${rule.property} (${rule.aggregation ?? ""}) ${rule.operator} ${rule.value} but got ${actualValue}`
          )
        );
      }
    }

    return results;
  }

  /**
   * Valuta l'aggregazione su una lista di righe
   */
  private evaluateAggregation(aggregation: string, property: string, rows: Record<string, any>[]): number {
    const values = rows
      .map((row) => this.getNestedValue(row, property))
      .map(Number)
      .filter((v) => !isNaN(v));

    switch (aggregation) {
      case "SUM":
        return values.reduce((sum, val) => sum + val, 0);

      case "AVG":
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;

      case "COUNT":
        return values.length;

      default:
        throw new Error(`Unsupported aggregation: ${aggregation}`);
    }
  }

  /**
   * Helper per estrarre valori annidati tramite dot notation (es. "data.value")
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path || path.trim() === "") return obj;
    if (obj === null || obj === undefined) return undefined;

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

  /**
   * Valuta l'operatore matematico o di stringa
   */
  private evaluateOperator(actual: string, operator: string, expected: string): boolean {
    switch (operator) {
      case "EQUALS":
        return actual === expected;

      case "NOT_EQUALS":
        return actual !== expected;

      case "GREATER_THAN": {
        const actNum = Number(actual);
        const expNum = Number(expected);
        return !isNaN(actNum) && !isNaN(expNum) && actNum > expNum;
      }

      case "LESS_THAN": {
        const actNum = Number(actual);
        const expNum = Number(expected);
        return !isNaN(actNum) && !isNaN(expNum) && actNum < expNum;
      }

      case "CONTAINS":
        return actual.toLowerCase().includes(expected.toLowerCase());

      default:
        return false;
    }
  }
}

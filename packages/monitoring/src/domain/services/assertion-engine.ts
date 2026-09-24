import { AssertionRule } from "../model/monitor/assertion-rule.js";
import { CheckResult } from "../model/check-execution/check-result.js";
import { AssertionResult } from "../model/check-execution/assertion-result.js";

export class AssertionEngine {
  /**
   * Valuta una lista di regole a fronte di un risultato del check
   */
  public evaluate(rules: AssertionRule[], result: CheckResult): AssertionResult[] {
    return rules.map((rule) => {
      // Se c'è un errore di connessione/rete e la regola non è sul tempo di risposta, fallisce
      if (result.error && rule.target !== "RESPONSE_TIME") {
        return AssertionResult.createFailed(
          rule,
          "N/A",
          `Connection error: ${result.error}`
        );
      }

      let actualValue: any;

      try {
        switch (rule.target) {
          case "STATUS_CODE":
            actualValue = result.statusCode !== undefined ? String(result.statusCode) : undefined;
            break;

          case "RESPONSE_TIME":
            actualValue = String(result.responseTimeMs);
            break;

          default:
            return AssertionResult.createFailed(rule, "N/A", `Unknown assertion target: ${rule.target}`);
        }
      } catch (err: any) {
        return AssertionResult.createFailed(rule, "N/A", `Error resolving actual value: ${err.message}`);
      }

      if (actualValue === undefined || actualValue === null) {
        return AssertionResult.createFailed(
          rule,
          "undefined",
          `Expected target ${rule.target} was not found in response.`
        );
      }

      const passed = this.evaluateOperator(actualValue, rule.operator, rule.value);
      if (passed) {
        return AssertionResult.createPassed(rule, actualValue);
      } else {
        return AssertionResult.createFailed(
          rule,
          actualValue,
          `Assertion failed: expected ${rule.target} ${rule.operator} ${rule.value} but got ${actualValue}`
        );
      }
    });
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

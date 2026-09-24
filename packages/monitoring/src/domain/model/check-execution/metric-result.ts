import { ValueObject } from "@monitor/shared-kernel";
import { MetricRule } from "../monitor/metric-rule.js";

export interface MetricResultProps {
  rule: MetricRule;
  passed: boolean;
  actualValue?: string;
  errorMessage?: string;
}

export class MetricResult extends ValueObject<MetricResultProps> {
  public get rule(): MetricRule {
    return this.props.rule;
  }

  public get passed(): boolean {
    return this.props.passed;
  }

  public get actualValue(): string | undefined {
    return this.props.actualValue;
  }

  public get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  public static createPassed(rule: MetricRule, actualValue: string): MetricResult {
    return new MetricResult({
      rule,
      passed: true,
      actualValue,
    });
  }

  public static createFailed(
    rule: MetricRule,
    actualValue: string,
    errorMessage: string
  ): MetricResult {
    return new MetricResult({
      rule,
      passed: false,
      actualValue,
      errorMessage,
    });
  }
}

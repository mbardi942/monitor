import { ValueObject } from "@monitor/shared-kernel";
import { AssertionRule } from "../monitor/assertion-rule.js";

export interface AssertionResultProps {
  rule: AssertionRule;
  passed: boolean;
  actualValue?: string;
  errorMessage?: string;
}

export class AssertionResult extends ValueObject<AssertionResultProps> {
  public get rule(): AssertionRule {
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

  public static createPassed(rule: AssertionRule, actualValue: string): AssertionResult {
    return new AssertionResult({
      rule,
      passed: true,
      actualValue,
    });
  }

  public static createFailed(
    rule: AssertionRule,
    actualValue: string,
    errorMessage: string
  ): AssertionResult {
    return new AssertionResult({
      rule,
      passed: false,
      actualValue,
      errorMessage,
    });
  }
}

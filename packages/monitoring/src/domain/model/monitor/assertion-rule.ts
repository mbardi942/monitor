import { ValueObject } from "@monitor/shared-kernel";

export type AssertionTarget = "STATUS_CODE" | "RESPONSE_TIME";
export type AssertionOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS";

export interface AssertionRuleProps {
  target: AssertionTarget;
  property?: string;
  operator: AssertionOperator;
  value: string;
}

export class AssertionRule extends ValueObject<AssertionRuleProps> {
  public get target(): AssertionTarget {
    return this.props.target;
  }

  public get property(): string | undefined {
    return this.props.property;
  }

  public get operator(): AssertionOperator {
    return this.props.operator;
  }

  public get value(): string {
    return this.props.value;
  }

  public get isHealthAssertion(): boolean {
    return true;
  }

  public static create(props: AssertionRuleProps): AssertionRule {
    if (!props.target) {
      throw new Error("Assertion target is required.");
    }
    if (!props.operator) {
      throw new Error("Assertion operator is required.");
    }
    if (props.value === undefined || props.value === null) {
      throw new Error("Assertion value is required.");
    }

    return new AssertionRule({
      target: props.target,
      property: props.property,
      operator: props.operator,
      value: props.value,
    });
  }
}


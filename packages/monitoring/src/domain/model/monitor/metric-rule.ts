import { ValueObject } from "@monitor/shared-kernel";

export type MetricOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "CONTAINS"
  | "CUSTOM_SCRIPT";

export type AggregationFunction = "SUM" | "AVG" | "COUNT" | "NONE";

export interface MetricRuleProps {
  property: string; // Il campo all'interno dei dati estratti (es. "temperature", o "" per singolo valore)
  operator: MetricOperator;
  value: string; // Valore di confronto, salvato come stringa
  aggregation?: AggregationFunction;
  script?: string; // Il codice JS se l'operatore è CUSTOM_SCRIPT
}

export class MetricRule extends ValueObject<MetricRuleProps> {
  public get property(): string {
    return this.props.property;
  }

  public get operator(): MetricOperator {
    return this.props.operator;
  }

  public get value(): string {
    return this.props.value;
  }

  public get aggregation(): AggregationFunction {
    return this.props.aggregation ?? "NONE";
  }

  public get script(): string | undefined {
    return this.props.script;
  }

  public get isCustomScript(): boolean {
    return this.props.operator === "CUSTOM_SCRIPT";
  }

  public static create(props: MetricRuleProps): MetricRule {
    if (props.operator === "CUSTOM_SCRIPT") {
      if (!props.script || props.script.trim() === "") {
        throw new Error("Script content is required when operator is CUSTOM_SCRIPT.");
      }
    } else {
      if (props.property === undefined || props.property === null) {
        throw new Error("Property is required for standard metric rules.");
      }
      if (props.value === undefined || props.value === null) {
        throw new Error("Value is required for standard metric rules.");
      }
    }

    return new MetricRule({
      property: props.property,
      operator: props.operator,
      value: props.value,
      aggregation: props.aggregation ?? "NONE",
      script: props.script,
    });
  }
}

import { describe, it, expect } from "vitest";
import { MetricEvaluationEngine } from "../domain/services/metric-evaluation-engine.js";
import { MetricRule } from "../domain/model/monitor/metric-rule.js";
import { ExtractedData } from "../domain/model/check-execution/extracted-data.js";
import { NodeVmScriptEvaluator } from "../infrastructure/services/node-vm-script-evaluator.js";

describe("MetricEvaluationEngine", () => {
  const scriptEvaluator = new NodeVmScriptEvaluator();
  const engine = new MetricEvaluationEngine(scriptEvaluator);

  it("should evaluate standard rules on single values successfully", async () => {
    const rules = [
      MetricRule.create({ property: "temperature", operator: "GREATER_THAN", value: "30" }),
      MetricRule.create({ property: "status", operator: "EQUALS", value: "ok" }),
    ];

    const data = ExtractedData.create({
      temperature: 32.5,
      status: "ok",
    });

    const outcomes = await engine.evaluate(rules, data);

    expect(outcomes[0].passed).toBe(true);
    expect(outcomes[0].actualValue).toBe("32.5");
    expect(outcomes[1].passed).toBe(true);
    expect(outcomes[1].actualValue).toBe("ok");
  });

  it("should fail validation if standard rules do not match", async () => {
    const rules = [
      MetricRule.create({ property: "temperature", operator: "GREATER_THAN", value: "35" }),
    ];

    const data = ExtractedData.create({
      temperature: 32.5,
    });

    const outcomes = await engine.evaluate(rules, data);

    expect(outcomes[0].passed).toBe(false);
    expect(outcomes[0].actualValue).toBe("32.5");
    expect(outcomes[0].errorMessage).toContain("Validation failed");
  });

  it("should evaluate aggregated rules on table rows", async () => {
    const rules = [
      MetricRule.create({
        property: "amount",
        operator: "GREATER_THAN",
        value: "100",
        aggregation: "SUM",
      }),
      MetricRule.create({
        property: "amount",
        operator: "EQUALS",
        value: "3",
        aggregation: "COUNT",
      }),
    ];

    const data = ExtractedData.createDetailed({
      extractionType: "TABLE",
      values: {},
      rows: [
        { id: 1, amount: 50 },
        { id: 2, amount: 60 },
        { id: 3, amount: 10 },
      ],
      extractedAt: new Date(),
    });

    const outcomes = await engine.evaluate(rules, data);

    expect(outcomes[0].passed).toBe(true); // SUM = 120 > 100
    expect(outcomes[0].actualValue).toBe("120");
    expect(outcomes[1].passed).toBe(true); // COUNT = 3
    expect(outcomes[1].actualValue).toBe("3");
  });

  it("should evaluate JavaScript custom scripts correctly", async () => {
    const rules = [
      MetricRule.create({
        property: "",
        operator: "CUSTOM_SCRIPT",
        value: "",
        script: "data.cpuUsage < 80 && rows.length > 0",
      }),
    ];

    const data = ExtractedData.createDetailed({
      extractionType: "TABLE",
      values: { cpuUsage: 45 },
      rows: [{ id: 1 }],
      extractedAt: new Date(),
    });

    const outcomes = await engine.evaluate(rules, data);

    expect(outcomes[0].passed).toBe(true);
    expect(outcomes[0].actualValue).toBe("true");
  });
});

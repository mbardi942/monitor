import { describe, it, expect } from "vitest";
import { AssertionEngine } from "../domain/services/assertion-engine.js";
import { AssertionRule } from "../domain/model/monitor/assertion-rule.js";
import { CheckResult } from "../domain/model/check-execution/check-result.js";

describe("AssertionEngine", () => {
  const engine = new AssertionEngine();

  it("should validate HTTP status code successfully", () => {
    const rules = [
      AssertionRule.create({ target: "STATUS_CODE", operator: "EQUALS", value: "200" }),
      AssertionRule.create({ target: "STATUS_CODE", operator: "NOT_EQUALS", value: "404" }),
    ];

    const result = CheckResult.createSuccess(120, 200, {}, "");
    const outcome = engine.evaluate(rules, result);

    expect(outcome[0].passed).toBe(true);
    expect(outcome[0].actualValue).toBe("200");
    expect(outcome[1].passed).toBe(true);
  });

  it("should fail validation if status code does not match", () => {
    const rules = [
      AssertionRule.create({ target: "STATUS_CODE", operator: "EQUALS", value: "200" }),
    ];

    const result = CheckResult.createSuccess(120, 500, {}, "");
    const outcome = engine.evaluate(rules, result);

    expect(outcome[0].passed).toBe(false);
    expect(outcome[0].actualValue).toBe("500");
    expect(outcome[0].errorMessage).toContain("expected STATUS_CODE EQUALS 200 but got 500");
  });

  it("should evaluate response time bounds", () => {
    const rules = [
      AssertionRule.create({ target: "RESPONSE_TIME", operator: "LESS_THAN", value: "500" }),
      AssertionRule.create({ target: "RESPONSE_TIME", operator: "GREATER_THAN", value: "50" }),
    ];

    const result = CheckResult.createSuccess(150, 200, {}, "");
    const outcome = engine.evaluate(rules, result);

    expect(outcome[0].passed).toBe(true);
    expect(outcome[1].passed).toBe(true);
  });



  it("should handle connection errors gracefully", () => {
    const rules = [
      AssertionRule.create({ target: "STATUS_CODE", operator: "EQUALS", value: "200" }),
      AssertionRule.create({ target: "RESPONSE_TIME", operator: "LESS_THAN", value: "1000" }),
    ];

    const result = CheckResult.createFailure(950, "ENOTFOUND");
    const outcome = engine.evaluate(rules, result);

    // Status code fails due to connection error
    expect(outcome[0].passed).toBe(false);
    expect(outcome[0].errorMessage).toContain("Connection error: ENOTFOUND");

    // Response time is evaluated even on connection error (for timeout tracking)
    expect(outcome[1].passed).toBe(true);
  });
});

import { DataExtractor } from "../domain/model/monitor/data-extractor.js";
import { DataExtractionService } from "../domain/services/data-extraction-service.js";

describe("DataExtractor & DataExtractionService", () => {
  const service = new DataExtractionService();

  it("should create a TABLE DataExtractor with empty dataPath for root JSON arrays", () => {
    const extractor = DataExtractor.create({
      schema: {
        type: "TABLE",
        dataPath: "",
        columns: [
          { path: "symbol", label: "Symbol", format: "text" },
          { path: "lastPrice", label: "Price", format: "currency" },
        ],
      },
      displayHint: "TABLE",
    });

    expect(extractor).toBeDefined();
    expect(extractor.schema.type).toBe("TABLE");
  });

  it("should extract table rows when response body is a root JSON array", () => {
    const extractor = DataExtractor.create({
      schema: {
        type: "TABLE",
        dataPath: "",
        columns: [
          { path: "symbol", label: "Symbol", format: "text" },
          { path: "lastPrice", label: "Price", format: "currency" },
        ],
      },
      displayHint: "TABLE",
    });

    const rootArrayBody = JSON.stringify([
      { symbol: "BTCUSDT", lastPrice: "65000" },
      { symbol: "ETHUSDT", lastPrice: "3500" },
    ]);

    const checkResult = CheckResult.createSuccess(120, 200, {}, rootArrayBody);
    const extracted = service.extract(checkResult, extractor);

    expect(extracted.rows).toBeDefined();
    expect(extracted.rows).toHaveLength(2);
    expect(extracted.rows![0]["Symbol"]).toBe("BTCUSDT");
    expect(extracted.rows![0]["Price"]).toBe("65000");
    expect(extracted.rows![1]["Symbol"]).toBe("ETHUSDT");
    expect(extracted.rows![1]["Price"]).toBe("3500");
  });

  it("should extract single value with array index dot notation like 1.0.value", () => {
    const extractor = DataExtractor.create({
      schema: {
        type: "SINGLE_VALUE",
        valuePath: "1.0.value",
        label: "Popolazione",
        format: "number",
      },
      displayHint: "SINGLE_VALUE",
    });

    const worldBankBody = JSON.stringify([
      { page: 1, total: 66 },
      [
        { date: "2025", value: 58915656 },
        { date: "2024", value: 58952704 },
      ],
    ]);

    const checkResult = CheckResult.createSuccess(150, 200, {}, worldBankBody);
    const extracted = service.extract(checkResult, extractor);

    expect(extracted.values["Popolazione"]).toBe(58915656);
  });
});

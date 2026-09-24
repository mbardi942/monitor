import { describe, it, expect } from "vitest";
import { NodeVmScriptEvaluator } from "../infrastructure/services/node-vm-script-evaluator.js";

describe("NodeVmScriptEvaluator", () => {
  const evaluator = new NodeVmScriptEvaluator();

  it("should evaluate simple boolean expressions", async () => {
    const context = { data: { temperature: 35 } };
    const result = await evaluator.evaluate("data.temperature > 30", context);
    expect(result).toBe(true);
  });

  it("should evaluate complex blocks of code with return statements", async () => {
    const context = {
      data: { values: [10, 20, 30] },
    };
    const script = `
      const sum = data.values.reduce((a, b) => a + b, 0);
      return sum > 50;
    `;
    const result = await evaluator.evaluate(script, context);
    expect(result).toBe(true);
  });

  it("should isolate the execution context and prevent external access", async () => {
    const context = {};
    // Prova ad accedere al global di Node o process
    await expect(evaluator.evaluate("process.exit(1)", context)).rejects.toThrow();
  });

  it("should respect execution timeout to prevent infinite loops", async () => {
    const context = {};
    const infiniteLoopScript = "while(true) {}";
    await expect(evaluator.evaluate(infiniteLoopScript, context)).rejects.toThrow("timeout");
  });
});

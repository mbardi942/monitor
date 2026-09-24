import vm from "vm";
import { ScriptEvaluator } from "../../domain/ports/script-evaluator.js";

export class NodeVmScriptEvaluator implements ScriptEvaluator {
  public async evaluate(script: string, context: Record<string, any>): Promise<any> {
    const sandbox = {
      ...context,
      console: {
        log: () => {}, // disabilitiamo il logging per sicurezza e pulizia
      },
    };

    vm.createContext(sandbox);

    // Se lo script contiene "return", lo avvolgiamo in una funzione autoinvocata (IIFE)
    // in modo che sia sintatticamente valido.
    let codeToRun = script.trim();
    if (codeToRun.includes("return")) {
      codeToRun = `(() => { ${codeToRun} })()`;
    }

    try {
      const result = vm.runInContext(codeToRun, sandbox, {
        timeout: 1000, // Timeout di 1 secondo per prevenire cicli infiniti
      });
      return result;
    } catch (err: any) {
      const msg = err.message.toLowerCase();
      if (msg.includes("timeout") || msg.includes("timed out")) {
        throw new Error(`Script execution timeout: ${err.message}`);
      }
      throw new Error(`Script execution error: ${err.message}`);
    }
  }
}

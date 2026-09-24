export interface ScriptEvaluator {
  /**
   * Esegue uno script in modo sicuro passando un contesto locale.
   * Ritorna il risultato dell'espressione valutata o il valore ritornato.
   */
  evaluate(script: string, context: Record<string, any>): Promise<any>;
}

import React, { useState } from "react";
import { Play, CheckCircle, AlertCircle } from "lucide-react";

interface ScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, onChange }) => {
  const [testPayload, setTestPayload] = useState('{\n  "active": 500,\n  "status": "ok"\n}');
  const [testResult, setTestResult] = useState<{ success: boolean; result?: any; error?: string } | null>(null);

  const handleDryRun = () => {
    try {
      // Parsing del payload JSON
      const data = JSON.parse(testPayload);

      // Creazione di una funzione isolata per testare lo script
      // ATTENZIONE: Questo è un dry-run lato client per comodità (power-user feature).
      // Lo script reale viene eseguito in una V8 Isolate sicura sul worker.
      const sandboxFn = new Function("data", script);
      const result = sandboxFn(data);

      setTestResult({ success: true, result });
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Permetti l'uso del tasto TAB nell'editor
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      const newScript = script.substring(0, start) + "  " + script.substring(end);
      onChange(newScript);
      
      // Ripristina la posizione del cursore dopo il re-render
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="form-group mt-1 relative group">
        <label className="form-label !text-[10px] mb-1 flex justify-between items-center">
          <span>Codice JavaScript (IDE-Lite)</span>
          <span className="text-neutral-500 font-mono text-[9px]">Variabile disponibile: data (Object)</span>
        </label>
        <div className="relative rounded-[var(--radius-inner)] overflow-hidden border border-neutral-700/60 focus-within:border-[hsl(var(--primary))] transition-colors">
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-3 text-[10px] font-mono text-neutral-600 select-none pointer-events-none">
            {script.split('\n').map((_, i) => (
              <span key={i} className="h-4 leading-4">{i + 1}</span>
            ))}
          </div>
          <textarea
            required
            rows={Math.max(4, script.split('\n').length)}
            value={script}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`// return data.active < 1000;`}
            spellCheck="false"
            className="w-full pl-11 pr-3 py-3 bg-neutral-950 text-neutral-300 font-mono text-xs leading-4 outline-none resize-y min-h-[80px]"
            style={{ tabSize: 2 }}
          />
        </div>
      </div>

      <div className="bg-neutral-900/50 p-3 rounded-[var(--radius-inner)] border border-neutral-800 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Simulazione Dry-Run
          </h4>
          <button
            type="button"
            onClick={handleDryRun}
            className="btn-secondary !py-1 !px-2.5 !text-[10px] flex items-center gap-1 bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--primary)/0.25)]"
          >
            <Play className="w-3 h-3" /> Esegui Test
          </button>
        </div>

        <div className="form-group">
          <label className="form-label !text-[9px] mb-1 text-neutral-500">Payload JSON di Test (Dati Simulati)</label>
          <textarea
            rows={3}
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            className="form-input font-mono text-[10px] w-full p-2 bg-neutral-950 border-neutral-800 text-neutral-400"
            spellCheck="false"
          />
        </div>

        {testResult && (
          <div className={`p-2.5 rounded border text-xs font-mono flex flex-col gap-1 ${
            testResult.success 
              ? testResult.result === true 
                ? "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.3)] text-[hsl(var(--success))]" 
                : "bg-[hsl(var(--warning)/0.1)] border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))]"
              : "bg-[hsl(var(--error)/0.1)] border-[hsl(var(--error)/0.3)] text-[hsl(var(--error))]"
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1">
              {testResult.success ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {testResult.success ? "Esecuzione completata" : "Errore di esecuzione"}
            </div>
            
            {testResult.success ? (
              <div className="text-[11px] text-white">
                <span className="text-neutral-500">Risultato: </span>
                {typeof testResult.result === 'boolean' 
                  ? (testResult.result ? "true (Regola Superata)" : "false (Regola Fallita / Allarme)") 
                  : JSON.stringify(testResult.result)}
              </div>
            ) : (
              <div className="text-[11px] whitespace-pre-wrap">{testResult.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

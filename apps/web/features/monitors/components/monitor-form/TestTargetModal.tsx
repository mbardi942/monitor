import React, { useState, useEffect, useMemo } from "react";
import { X, CheckCircle, XCircle, Copy, Check, FileJson, FileCode, Table as TableIcon, FileText } from "lucide-react";

export type TestTargetMode = "CONNECTION" | "EXTRACTION";

interface TestTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any;
  isLoading: boolean;
  testMode?: TestTargetMode;
}

type ViewFormat = "JSON" | "XML" | "CSV" | "RAW";

export const TestTargetModal: React.FC<TestTargetModalProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
  testMode = "CONNECTION",
}) => {
  const [activeFormat, setActiveFormat] = useState<ViewFormat>("JSON");
  const [copied, setCopied] = useState(false);

  // Determina automaticamente il formato ideale in base alla risposta
  useEffect(() => {
    if (result?.body) {
      const trimmed = result.body.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        setActiveFormat("JSON");
      } else if (trimmed.startsWith("<")) {
        setActiveFormat("XML");
      } else if (trimmed.includes(",") && trimmed.includes("\n")) {
        setActiveFormat("CSV");
      } else {
        setActiveFormat("RAW");
      }
    } else if (result?.extractedData) {
      setActiveFormat("JSON");
    }
  }, [result]);

  const rawBody = result?.body || (result?.extractedData ? JSON.stringify(result.extractedData, null, 2) : "");

  const handleCopy = () => {
    if (rawBody) {
      navigator.clipboard.writeText(rawBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Parsing e formattazione del payload per ciascun tab
  const formattedContent = useMemo(() => {
    if (!rawBody) return "";

    if (activeFormat === "JSON") {
      try {
        const parsed = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
        return JSON.stringify(parsed, null, 2);
      } catch {
        return rawBody;
      }
    }

    if (activeFormat === "XML") {
      // Semplice indentazione XML visuale
      return rawBody;
    }

    return rawBody;
  }, [rawBody, activeFormat]);

  // Parsing CSV per rendering tabellare
  const csvParsed = useMemo(() => {
    if (activeFormat !== "CSV" || !rawBody) return null;
    try {
      const lines = rawBody.trim().split("\n").map((l: string) => l.split(/[,;\t]/).map((c: string) => c.trim()));
      if (lines.length > 0) {
        return {
          headers: lines[0],
          rows: lines.slice(1, 20), // Mostra prime 20 righe
          total: lines.length - 1,
        };
      }
    } catch {
      return null;
    }
    return null;
  }, [rawBody, activeFormat]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col bg-[hsl(260_25%_4.5%)] shadow-2xl border border-[hsl(var(--border-color))]/70 rounded-[var(--radius)]">
        {/* Header Modale */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border-color))]/50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />
            <h2 className="text-base font-bold text-white">
              {testMode === "EXTRACTION" ? "Collaudo Estrazione & Mappatura Dati" : "Collaudo Connessione & Risposta"}
            </h2>
          </div>
          <button onClick={onClose} className="btn-icon" title="Chiudi">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Corpo Modale */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-400">
              <div className="w-9 h-9 rounded-full border-2 border-t-[hsl(var(--primary))] border-r-[hsl(var(--primary))] border-b-transparent border-l-transparent animate-spin" />
              <p className="text-sm font-medium text-neutral-300">Esecuzione del test in corso...</p>
              <span className="text-xs text-neutral-500">Invio richiesta alla sonda di rete</span>
            </div>
          ) : result ? (
            <>
              {/* Status Bar Sintetica */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 p-3.5 rounded-md border border-neutral-800">
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <div className="flex items-center gap-1.5 text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 px-3 py-1 rounded-full font-bold text-xs">
                      <CheckCircle className="w-4 h-4" /> Successo
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[hsl(var(--error))] bg-[hsl(var(--error))]/10 px-3 py-1 rounded-full font-bold text-xs">
                      <XCircle className="w-4 h-4" /> Fallito
                    </div>
                  )}

                  {result.statusCode && (
                    <div className={`text-xs font-mono px-2.5 py-1 rounded-md border border-neutral-800 ${
                      result.statusCode >= 200 && result.statusCode < 300
                        ? "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 font-bold"
                        : "text-[hsl(var(--error))] bg-[hsl(var(--error))]/10 font-bold"
                    }`}>
                      HTTP {result.statusCode}
                    </div>
                  )}

                  <div className="text-xs font-mono text-neutral-300 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800">
                    {result.responseTimeMs !== undefined ? `${result.responseTimeMs} ms` : "-- ms"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1.5 ml-auto"
                  title="Copia corpo risposta"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> Copiato!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copia Risposta
                    </>
                  )}
                </button>
              </div>
              
              {/* Banner Errore di Connessione */}
              {result.error && (
                <div className="bg-[hsl(var(--error))]/10 border border-[hsl(var(--error))]/30 rounded-md p-4 text-[hsl(var(--error))] text-sm">
                  <h4 className="font-bold mb-1 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Errore Sonda
                  </h4>
                  <p className="font-mono text-xs text-neutral-300 mt-1">{result.error}</p>
                </div>
              )}

              {/* Risultato Dati Estratti (se presenti o in modalità EXTRACTION) */}
              {result.extractedData && (
                <div className="bg-[hsl(var(--primary))/0.03] border border-[hsl(var(--primary))/0.2] p-4 rounded-md">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))] flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Anteprima Dati Estratti
                    </h3>
                    <span className="text-[10px] text-neutral-400">Elaborati secondo lo schema definito</span>
                  </div>
                  
                  {/* Se ci sono valori singoli / coppie */}
                  {result.extractedData.values && Object.keys(result.extractedData.values).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-3">
                      {Object.entries(result.extractedData.values).map(([key, val]: [string, any]) => (
                        <div key={key} className="bg-neutral-900/90 p-2.5 rounded border border-neutral-800 flex flex-col gap-0.5">
                          <span className="text-[10px] text-neutral-400 uppercase font-semibold">{key}</span>
                          <span className="text-sm font-bold font-mono text-white truncate">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Visualizzazione RAW JSON dei dati estratti */}
                  <pre className="bg-neutral-950 p-3 rounded border border-neutral-800/80 overflow-x-auto text-xs font-mono text-neutral-300 max-h-44">
                    {JSON.stringify(result.extractedData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Risultati Asserzioni */}
              {result.assertionResults && result.assertionResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Verifica Regole di Asserzione
                  </h3>
                  <div className="flex flex-col gap-2">
                    {result.assertionResults.map((ar: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between gap-3 bg-neutral-900/50 border border-neutral-800 p-2.5 rounded-md text-xs">
                        <div className="flex items-center gap-2">
                          {ar.passed ? (
                            <CheckCircle className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[hsl(var(--error))] shrink-0" />
                          )}
                          <span className="font-mono text-neutral-300">
                            {ar.rule?.target || ar.ruleTarget} {ar.rule?.operator || ar.operator} {ar.rule?.value || ar.expectedValue}
                          </span>
                        </div>
                        {!ar.passed && (
                          <span className="text-[hsl(var(--error))] font-mono text-[11px]">
                            Rilevato: {ar.actualValue ?? "non trovato"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viewer Payload Risposta con Tab Formato */}
              {rawBody && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Corpo Risposta Ricevuta
                    </h3>

                    {/* Tab Switcher Formato */}
                    <div className="flex bg-neutral-900 p-0.5 rounded border border-neutral-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveFormat("JSON")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          activeFormat === "JSON" ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-bold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <FileJson className="w-3.5 h-3.5" /> JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFormat("XML")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          activeFormat === "XML" ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-bold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" /> XML
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFormat("CSV")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          activeFormat === "CSV" ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-bold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <TableIcon className="w-3.5 h-3.5" /> CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFormat("RAW")}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          activeFormat === "RAW" ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-bold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" /> Testo Raw
                      </button>
                    </div>
                  </div>

                  {/* Render Tabellare se CSV valido */}
                  {activeFormat === "CSV" && csvParsed ? (
                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-md overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-neutral-900/90 text-neutral-400 uppercase text-[10px] border-b border-neutral-800 sticky top-0">
                          <tr>
                            {csvParsed.headers.map((h: string, idx: number) => (
                              <th key={idx} className="p-2.5 font-mono">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900 font-mono text-neutral-300">
                          {csvParsed.rows.map((r: string[], rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-neutral-900/30">
                              {r.map((cell: string, cIdx: number) => (
                                <td key={cIdx} className="p-2.5">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Render Codice / Pre per JSON, XML, RAW */
                    <pre className="bg-neutral-950/90 border border-neutral-800/80 p-4 rounded-md overflow-x-auto text-xs font-mono text-neutral-300 max-h-80 leading-relaxed select-text">
                      {formattedContent.length > 50000 ? formattedContent.substring(0, 50000) + "\n... (anteprima troncata a 50KB)" : formattedContent}
                    </pre>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-neutral-500 text-center py-12">Nessun risultato disponibile.</div>
          )}
        </div>
        
        {/* Footer Modale */}
        <div className="p-4 border-t border-[hsl(var(--border-color))]/50 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

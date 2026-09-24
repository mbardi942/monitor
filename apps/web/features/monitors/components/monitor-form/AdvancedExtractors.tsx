import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { SegmentedControl } from "@/shared/components/SegmentedControl";
import { MonitorFormState, MonitorFormAction, DisplayHint, ColumnDefinition, KeyValuePairDefinition } from "./types";
import { ScriptEditor } from "./ScriptEditor";

interface AdvancedExtractorsProps {
  state: MonitorFormState;
  dispatch: React.Dispatch<MonitorFormAction>;
}

export const AdvancedExtractors: React.FC<AdvancedExtractorsProps> = ({ state, dispatch }) => {
  const {
    type,
    enableExtractor,
    schemaType,
    displayHint,
    maxRows,
    pageSize,
    retainHistory,
    singleValuePath,
    singleValueLabel,
    singleValueUnit,
    singleValueFormat,
    singleValueDecimals,
    tableDataPath,
    tableColumns,
    keyValuePairs,
    metricRules,
  } = state;

  if (type === "PING") return null;

  const setEnableExtractor = (val: boolean) => dispatch({ type: "SET_FIELD", field: "enableExtractor", value: val });
  const setSchemaType = (val: any) => dispatch({ type: "SET_SCHEMA_TYPE", value: val });
  const setDisplayHint = (val: DisplayHint) => dispatch({ type: "SET_DISPLAY_HINT", value: val });
  const setMaxRows = (val: number) => dispatch({ type: "SET_FIELD", field: "maxRows", value: val });
  const setPageSize = (val: number) => dispatch({ type: "SET_FIELD", field: "pageSize", value: val });
  const setRetainHistory = (val: boolean) => dispatch({ type: "SET_FIELD", field: "retainHistory", value: val });
  
  const setSingleValuePath = (val: string) => dispatch({ type: "SET_FIELD", field: "singleValuePath", value: val });
  const setSingleValueLabel = (val: string) => dispatch({ type: "SET_FIELD", field: "singleValueLabel", value: val });
  const setSingleValueUnit = (val: string) => dispatch({ type: "SET_FIELD", field: "singleValueUnit", value: val });
  const setSingleValueFormat = (val: string) => dispatch({ type: "SET_FIELD", field: "singleValueFormat", value: val });
  const setSingleValueDecimals = (val?: number) => dispatch({ type: "SET_FIELD", field: "singleValueDecimals", value: val });
  
  const setTableDataPath = (val: string) => dispatch({ type: "SET_FIELD", field: "tableDataPath", value: val });
  const handleAddColumn = () => dispatch({ type: "ADD_COLUMN" });
  const handleRemoveColumn = (index: number) => dispatch({ type: "REMOVE_COLUMN", index });
  const handleColumnChange = (index: number, field: keyof ColumnDefinition, val: string) =>
    dispatch({ type: "SET_COLUMN_FIELD", index, field, value: val });
  
  const handleAddKeyValuePair = () => dispatch({ type: "ADD_KEY_VALUE_PAIR" });
  const handleRemoveKeyValuePair = (index: number) => dispatch({ type: "REMOVE_KEY_VALUE_PAIR", index });
  const handleKeyValuePairChange = (index: number, field: keyof KeyValuePairDefinition, val: string) =>
    dispatch({ type: "SET_KEY_VALUE_PAIR_FIELD", index, field, value: val });
  
  const handleAddMetricRule = () => dispatch({ type: "ADD_METRIC_RULE" });
  const handleRemoveMetricRule = (index: number) => dispatch({ type: "REMOVE_METRIC_RULE", index });
  const handleMetricRuleChange = (index: number, field: string, val: string) =>
    dispatch({ type: "SET_METRIC_RULE_FIELD", index, field, value: val });

  return (
    <div className="border-t border-[hsl(var(--border-color))]/80 pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Data Extractor (Estrazione Dati Avanzata)
        </h3>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enableExtractor}
            onChange={(e) => setEnableExtractor(e.target.checked)}
            className="sr-only peer toggle-switch-input"
          />
          <div className="w-9 h-5 bg-[hsl(260_10%_15%)] rounded-full transition-all duration-200 toggle-switch-bg relative flex items-center">
            <div className="w-3.5 h-3.5 bg-neutral-400 rounded-full transition-all duration-200 toggle-switch-handle absolute left-[3px]" />
          </div>
          <span className="ml-2.5 text-xs font-semibold text-neutral-300">
            Abilita Estrazione Dati
          </span>
        </label>
      </div>

      {enableExtractor && (
        <div className="flex flex-col gap-4 bg-[hsl(260_25%_4.5%)] p-4 border border-[hsl(var(--border-color))]/50 rounded-[var(--radius)] mt-3">
          {/* Tipo Schema + Display Hint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Tipo Schema di Estrazione</label>
              <SegmentedControl
                value={schemaType}
                onChange={(val) => setSchemaType(val as any)}
                options={[
                  { value: "SINGLE_VALUE", label: "Valore Singolo" },
                  { value: "TABLE", label: "Tabella di Dati" },
                  { value: "KEY_VALUE_PAIRS", label: "Coppie Chiave-Valore" },
                ]}
              />
              <span className="text-[10px] text-neutral-500 mt-1">
                {schemaType === "SINGLE_VALUE" && "es. Saldo, Temperatura, Stato API"}
                {schemaType === "TABLE" && "es. Lista Transazioni, Log di sistema"}
                {schemaType === "KEY_VALUE_PAIRS" && "es. Metriche dettagliate CPU, RAM, Disk"}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Stile Visualizzazione</label>
              <SegmentedControl
                value={displayHint}
                onChange={(val) => setDisplayHint(val as any)}
                options={[
                  { value: "STATUS_BADGE", label: "Stato" },
                  { value: "SINGLE_VALUE", label: "Valore" },
                  { value: "KEY_VALUE_LIST", label: "Lista C-V" },
                  ...(schemaType === "TABLE" ? [{ value: "TABLE" as any, label: "Tabella" }] : []),
                  ...(schemaType === "SINGLE_VALUE" ? [{ value: "SPARKLINE" as any, label: "Sparkline" }] : []),
                ]}
              />
              <span className="text-[10px] text-neutral-500 mt-1">
                {displayHint === "STATUS_BADGE" && "Mostra solo lo stato UP o DOWN"}
                {displayHint === "SINGLE_VALUE" && "Visualizza il valore estratto in grande"}
                {displayHint === "KEY_VALUE_LIST" && "Mostra le coppie chiave-valore incolonnate"}
                {displayHint === "TABLE" && "Visualizza i dati estratti in una tabella"}
                {displayHint === "SPARKLINE" && "Traccia un grafico temporale dell'andamento"}
              </span>
            </div>
          </div>

          {/* Storico + Limitazione Righe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="retainHistory"
                checked={retainHistory || displayHint === "SPARKLINE"}
                disabled={displayHint === "SPARKLINE"}
                onChange={(e) => setRetainHistory(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-900 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary)/0.4)]"
              />
              <label htmlFor="retainHistory" className="text-xs text-neutral-300 font-medium cursor-pointer select-none">
                Conserva storico {displayHint === "SPARKLINE" && <span className="text-[10px] text-[hsl(var(--primary))] font-semibold block">(Richiesto)</span>}
              </label>
            </div>

            {schemaType === "TABLE" && (
              <>
                <div className="form-group">
                  <label className="form-label">Massimo Righe da Estrarre</label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={maxRows}
                    onChange={(e) => setMaxRows(Number(e.target.value))}
                    className="form-input font-mono"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Righe per Pagina</label>
                  <input
                    type="number"
                    min="1"
                    max={maxRows}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="form-input font-mono"
                  />
                </div>
              </>
            )}
          </div>

          <div className="border-t border-neutral-900 pt-3 mt-1">
            {schemaType === "SINGLE_VALUE" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">JSON Path del Valore</label>
                  <input
                    type="text"
                    required
                    value={singleValuePath}
                    onChange={(e) => setSingleValuePath(e.target.value)}
                    placeholder="es. data.balance"
                    className="form-input font-mono"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Etichetta (Label)</label>
                  <input
                    type="text"
                    required
                    value={singleValueLabel}
                    onChange={(e) => setSingleValueLabel(e.target.value)}
                    placeholder="es. Saldo"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unità di Misura</label>
                  <input
                    type="text"
                    value={singleValueUnit}
                    onChange={(e) => setSingleValueUnit(e.target.value)}
                    placeholder="es. € o °C"
                    className="form-input font-mono"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Formato Valore</label>
                  <select
                    value={singleValueFormat}
                    onChange={(e) => setSingleValueFormat(e.target.value)}
                    className="form-select"
                  >
                    <option value="text">Testo / Default</option>
                    <option value="number">Numero Formattato</option>
                    <option value="currency">Valuta (Euro - €)</option>
                    <option value="percentage">Percentuale (%)</option>
                  </select>
                </div>
                {singleValueFormat !== "text" && (
                  <div className="form-group">
                    <label className="form-label">Cifre Decimali</label>
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={singleValueDecimals !== undefined ? singleValueDecimals : ""}
                      onChange={(e) => setSingleValueDecimals(e.target.value === "" ? undefined : Number(e.target.value))}
                      placeholder="es. 2 (default automatico)"
                      className="form-input font-mono"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1">
                      Numero fisso di decimali da visualizzare (es. 0 per interi, 2 per valute).
                    </span>
                  </div>
                )}
              </div>
            )}

            {schemaType === "TABLE" && (
              <div className="flex flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">JSON Path dell'Array (opzionale se l'array è alla radice)</label>
                  <input
                    type="text"
                    value={tableDataPath}
                    onChange={(e) => setTableDataPath(e.target.value)}
                    placeholder="es. data.orders (lascia vuoto se la risposta è un array [...])"
                    className="form-input font-mono"
                  />
                </div>

                <div className="flex justify-between items-center mt-2 mb-1">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Colonne Tabella</span>
                  <button type="button" onClick={handleAddColumn} className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Aggiungi Colonna
                  </button>
                </div>

                {tableColumns.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic text-center p-3">Nessuna colonna definita.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {tableColumns.map((col, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-[hsl(260_25%_4.5%)] p-2 rounded">
                        <input
                          type="text"
                          required
                          value={col.path}
                          onChange={(e) => handleColumnChange(idx, "path", e.target.value)}
                          placeholder="Path (es. id)"
                          className="form-input flex-1 !py-1.5 !px-3 font-mono text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={col.label}
                          onChange={(e) => handleColumnChange(idx, "label", e.target.value)}
                          placeholder="Etichetta"
                          className="form-input flex-1 !py-1.5 !px-3 text-xs"
                        />
                        <select
                          value={col.format || "text"}
                          onChange={(e) => handleColumnChange(idx, "format", e.target.value)}
                          className="form-select !py-1.5 !px-3 text-xs"
                        >
                          <option value="text">Testo</option>
                          <option value="number">Numero</option>
                          <option value="currency">Valuta</option>
                          <option value="percentage">Percentuale</option>
                        </select>
                        <button type="button" onClick={() => handleRemoveColumn(idx)} className="btn-icon">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {schemaType === "KEY_VALUE_PAIRS" && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Coppie C-V</span>
                  <button type="button" onClick={handleAddKeyValuePair} className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Aggiungi Coppia
                  </button>
                </div>

                {keyValuePairs.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic text-center p-3">Nessuna coppia definita.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {keyValuePairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-[hsl(260_25%_4.5%)] p-2 rounded">
                        <input
                          type="text"
                          required
                          value={pair.path}
                          onChange={(e) => handleKeyValuePairChange(idx, "path", e.target.value)}
                          placeholder="Path"
                          className="form-input flex-1 !py-1.5 !px-3 font-mono text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={pair.label}
                          onChange={(e) => handleKeyValuePairChange(idx, "label", e.target.value)}
                          placeholder="Etichetta"
                          className="form-input flex-1 !py-1.5 !px-3 text-xs"
                        />
                        <select
                          value={pair.format || "text"}
                          onChange={(e) => handleKeyValuePairChange(idx, "format", e.target.value)}
                          className="form-select !py-1.5 !px-3 text-xs"
                        >
                          <option value="text">Testo</option>
                          <option value="number">Numero</option>
                          <option value="currency">Valuta</option>
                          <option value="percentage">Percentuale</option>
                        </select>
                        <button type="button" onClick={() => handleRemoveKeyValuePair(idx)} className="btn-icon">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="border-t border-[hsl(var(--border-color))]/50 pt-5 mt-4 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Regole Metriche sui Dati Estratti</h4>
              </div>
              <button type="button" onClick={handleAddMetricRule} className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Aggiungi Regola Metrica
              </button>
            </div>
            {metricRules.length === 0 ? (
              <p className="text-xs text-neutral-500 italic text-center p-4">Nessuna regola metrica configurata.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {metricRules.map((rule, idx) => (
                  <div key={idx} className="flex flex-col gap-3 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius)] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[120px]">
                        <label className="form-label !text-[10px] mb-1">Operatore</label>
                        <select
                          value={rule.operator}
                          onChange={(e) => handleMetricRuleChange(idx, "operator", e.target.value)}
                          className="form-select w-full !py-1.5 !px-3 text-xs"
                        >
                          <option value="EQUALS">Uguale a (==)</option>
                          <option value="NOT_EQUALS">Diverso da (!=)</option>
                          <option value="GREATER_THAN">Maggiore di (&gt;)</option>
                          <option value="LESS_THAN">Minore di (&lt;)</option>
                          <option value="CONTAINS">Contiene</option>
                          <option value="CUSTOM_SCRIPT">Script JS Personalizzato</option>
                        </select>
                      </div>

                      {rule.operator !== "CUSTOM_SCRIPT" && (
                        <div className="flex-2 min-w-[150px]">
                          <label className="form-label !text-[10px] mb-1 font-mono">Metrica / Proprietà</label>
                          <input
                            type="text"
                            required
                            value={rule.property || ""}
                            onChange={(e) => handleMetricRuleChange(idx, "property", e.target.value)}
                            placeholder="es. temperature"
                            className="form-input w-full !py-1.5 !px-3 font-mono text-xs"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-[120px]">
                        <label className="form-label !text-[10px] mb-1">Aggregazione temporale</label>
                        <select
                          value={rule.aggregation || "NONE"}
                          onChange={(e) => handleMetricRuleChange(idx, "aggregation", e.target.value)}
                          className="form-select w-full !py-1.5 !px-3 text-xs"
                        >
                          <option value="NONE">Nessuna (Valore Istantaneo)</option>
                          <option value="SUM">Somma (SUM)</option>
                          <option value="AVG">Media (AVG)</option>
                          <option value="COUNT">Conteggio (COUNT)</option>
                        </select>
                      </div>

                      {rule.operator !== "CUSTOM_SCRIPT" && (
                        <div className="flex-1 min-w-[120px]">
                          <label className="form-label !text-[10px] mb-1">Valore atteso</label>
                          <input
                            type="text"
                            required
                            value={rule.value || ""}
                            onChange={(e) => handleMetricRuleChange(idx, "value", e.target.value)}
                            placeholder="es. 100"
                            className="form-input w-full !py-1.5 !px-3 text-xs font-mono"
                          />
                        </div>
                      )}

                      <div className="self-end pb-0.5">
                        <button type="button" onClick={() => handleRemoveMetricRule(idx)} className="btn-icon hover:text-[hsl(var(--error))]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {rule.operator === "CUSTOM_SCRIPT" && (
                      <ScriptEditor
                        script={rule.script || ""}
                        onChange={(val) => handleMetricRuleChange(idx, "script", val)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

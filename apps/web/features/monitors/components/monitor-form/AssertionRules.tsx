import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { MonitorFormState, MonitorFormAction, RuleItem } from "./types";

interface AssertionRulesProps {
  state: MonitorFormState;
  dispatch: React.Dispatch<MonitorFormAction>;
}

export const AssertionRules: React.FC<AssertionRulesProps> = ({ state, dispatch }) => {
  const { rules } = state;

  const handleAddRule = () => dispatch({ type: "ADD_RULE" });
  const handleRemoveRule = (index: number) => dispatch({ type: "REMOVE_RULE", index });
  const handleRuleChange = (index: number, field: keyof RuleItem, val: string) =>
    dispatch({ type: "SET_RULE_FIELD", index, field, value: val });

  return (
    <div className="border-t border-neutral-800/80 pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Regole di Validazione (Assert)
        </h3>
        <button
          type="button"
          onClick={handleAddRule}
          className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Aggiungi Regola
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 bg-[hsl(260_25%_4.5%)] border border-[hsl(var(--border-color))]/50 rounded-[var(--radius-inner)]"
          >
            <div className="flex-1 min-w-[120px]">
              <select
                value={rule.target}
                onChange={(e) => handleRuleChange(idx, "target", e.target.value)}
                className="form-select w-full !py-1.5 !px-3"
              >
                <option value="STATUS_CODE">Status Code</option>
                <option value="RESPONSE_TIME">Response Time</option>
                <option value="JSON_BODY">JSON Body Path</option>
              </select>
            </div>

            {rule.target === "JSON_BODY" && (
              <div className="flex-1 min-w-[120px]">
                <input
                  type="text"
                  required
                  value={rule.property || rule.path || ""}
                  onChange={(e) => handleRuleChange(idx, "property", e.target.value)}
                  placeholder="path.to.prop"
                  className="form-input w-full !py-1.5 !px-3 font-mono"
                />
              </div>
            )}

            <div>
              <select
                value={rule.operator}
                onChange={(e) => handleRuleChange(idx, "operator", e.target.value)}
                className="form-select !py-1.5 !px-3"
              >
                <option value="EQUALS">==</option>
                <option value="NOT_EQUALS">!=</option>
                <option value="GREATER_THAN">&gt;</option>
                <option value="LESS_THAN">&lt;</option>
                <option value="CONTAINS">CONTAINS</option>
              </select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <input
                type="text"
                required
                value={rule.value}
                onChange={(e) => handleRuleChange(idx, "value", e.target.value)}
                placeholder="es. 200 o 500"
                className="form-input w-full !py-1.5 !px-3 font-mono"
              />
            </div>

            <button
              type="button"
              disabled={rules.length <= 1}
              onClick={() => handleRemoveRule(idx)}
              className="btn-icon hover:text-[hsl(var(--error))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

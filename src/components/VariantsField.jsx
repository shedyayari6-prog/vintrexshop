import { useState } from "react";

/**
 * Editor for product options. Put it in your product form.
 * value: [{ type: "color" | "size", values: [{ label, hex? }] }]   -> save in products.options (jsonb)
 */
export default function VariantsField({ value = [], onChange }) {
  const [draftLabel, setDraftLabel] = useState({});
  const [draftHex, setDraftHex] = useState({});

  const addGroup = (type) => onChange([...value, { type, values: [] }]);
  const removeGroup = (i) => onChange(value.filter((_, x) => x !== i));
  const patchGroup = (i, values) => onChange(value.map((g, x) => (x === i ? { ...g, values } : g)));

  function addValue(i) {
    const g = value[i];
    const label = (draftLabel[i] || "").trim();
    if (!label || g.values.some((v) => v.label.toLowerCase() === label.toLowerCase())) return;
    const item = g.type === "color" ? { label, hex: draftHex[i] || "#000000" } : { label };
    patchGroup(i, [...g.values, item]);
    setDraftLabel((s) => ({ ...s, [i]: "" }));
  }

  return (
    <div className="variants">
      <strong>Options (optional)</strong>
      {value.map((g, i) => (
        <div key={i} className="variant-group">
          <div className="variant-head">
            <span>{g.type === "color" ? "Colors" : "Sizes"}</span>
            <button type="button" className="btn btn-ghost danger" onClick={() => removeGroup(i)}>Remove</button>
          </div>

          <div className="swatches">
            {g.values.map((v, j) => (
              <button key={v.label} type="button" title={`Remove ${v.label}`}
                className={g.type === "color" ? "swatch" : "swatch swatch-size"}
                style={g.type === "color" ? { background: v.hex } : undefined}
                onClick={() => patchGroup(i, g.values.filter((_, x) => x !== j))}>
                {g.type === "size" ? v.label : ""}
              </button>
            ))}
          </div>

          <div className="variant-add">
            {g.type === "color" && (
              <input type="color" value={draftHex[i] || "#000000"} onChange={(e) => setDraftHex((s) => ({ ...s, [i]: e.target.value }))} />
            )}
            <input value={draftLabel[i] || ""} placeholder={g.type === "color" ? "Color name (Black)" : "Size (M, 42...)"}
              onChange={(e) => setDraftLabel((s) => ({ ...s, [i]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(i); } }} />
            <button type="button" className="btn" onClick={() => addValue(i)}>Add</button>
          </div>
          <small className="muted">Click a circle to remove it.</small>
        </div>
      ))}

      <div className="variant-actions">
        {!value.some((g) => g.type === "color") && <button type="button" className="btn" onClick={() => addGroup("color")}>Add color circles</button>}
        {!value.some((g) => g.type === "size") && <button type="button" className="btn" onClick={() => addGroup("size")}>Add size circles</button>}
      </div>
    </div>
  );
}

/**
 * Customer-facing picker. Use it on the product card / product page in StoreView.
 * selected: { color?: "Black", size?: "M" }
 */
export function VariantPicker({ options = [], selected = {}, onSelect }) {
  if (!options.length) return null;
  return (
    <div className="variant-picker">
      {options.map((g) => (
        <div key={g.type} className="swatches" role="radiogroup" aria-label={g.type}>
          {g.values.map((v) => {
            const on = selected[g.type] === v.label;
            return (
              <button key={v.label} type="button" role="radio" aria-checked={on} title={v.label}
                className={`${g.type === "color" ? "swatch" : "swatch swatch-size"}${on ? " is-on" : ""}`}
                style={g.type === "color" ? { background: v.hex } : undefined}
                onClick={() => onSelect(g.type, v.label)}>
                {g.type === "size" ? v.label : ""}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

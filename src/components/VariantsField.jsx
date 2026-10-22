import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import "./variants.css";

/**
 * Editor for product options. Put it in your product form.
 * value: [{ type: "color" | "size", values: [{ label, hex?, soldOut? }] }]   -> saved in products.options (jsonb)
 */

const nextLabel = (g) => {
  const base = g.type === "color" ? "Color" : "Size";
  let n = g.values.length + 1;
  while (g.values.some((v) => v.label.toLowerCase() === `${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
};

/** Run this before saving: trims names, drops empty or repeated ones and empty groups. */
export function cleanOptions(options = []) {
  return options
    .map((g) => {
      const seen = new Set();
      const values = (g.values || [])
        .map((v) => ({ ...v, label: (v.label || "").trim() }))
        .filter((v) => {
          const key = v.label.toLowerCase();
          if (!v.label || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((v) => ({
          label: v.label,
          ...(g.type === "color" ? { hex: v.hex || "#000000" } : {}),
          ...(v.soldOut ? { soldOut: true } : {}),
        }));
      return { type: g.type, values };
    })
    .filter((g) => g.values.length > 0);
}

export default function VariantsField({ value = [], onChange }) {
  const [menu, setMenu] = useState(false);
  const [sel, setSel] = useState(null); // { g: groupIndex, v: circleIndex }

  const hasColor = value.some((g) => g.type === "color");
  const hasSize = value.some((g) => g.type === "size");

  const addGroup = (type) => { onChange([...value, { type, values: [] }]); setMenu(false); };
  const removeGroup = (i) => { onChange(value.filter((_, x) => x !== i)); setSel(null); };
  const patchGroup = (i, values) => onChange(value.map((g, x) => (x === i ? { ...g, values } : g)));
  const patchValue = (i, j, patch) =>
    patchGroup(i, value[i].values.map((v, x) => (x === j ? { ...v, ...patch } : v)));
  const removeValue = (i, j) => { patchGroup(i, value[i].values.filter((_, x) => x !== j)); setSel(null); };

  function addCircle(i) {
    const g = value[i];
    const item = g.type === "color" ? { label: nextLabel(g), hex: "#000000" } : { label: nextLabel(g) };
    patchGroup(i, [...g.values, item]);
    setSel({ g: i, v: g.values.length }); // open it so the owner can name it right away
  }

  return (
    <div className="variants">
      <strong>Options (optional)</strong>

      {value.map((g, i) => {
        const cur = sel && sel.g === i ? g.values[sel.v] : null;
        return (
          <div key={g.type} className="variant-group">
            <div className="variant-head">
              <span>{g.type === "color" ? "Colors" : "Sizes"}</span>
              <button type="button" className="btn btn-ghost danger" onClick={() => removeGroup(i)}>Remove</button>
            </div>

            <div className="swatches">
              {g.values.map((v, j) => (
                <button key={j} type="button" title={`${v.label}${v.soldOut ? " (sold out)" : ""} - click to edit`}
                  className={`${g.type === "color" ? "swatch" : "swatch swatch-size"}${v.soldOut ? " is-out" : ""}${sel && sel.g === i && sel.v === j ? " is-edit" : ""}`}
                  style={g.type === "color" ? { background: v.hex } : undefined}
                  onClick={() => setSel(sel && sel.g === i && sel.v === j ? null : { g: i, v: j })}>
                  {g.type === "size" ? (v.label || "?") : ""}
                </button>
              ))}
              <button type="button" className="vf-plus" aria-label={g.type === "color" ? "Add a color" : "Add a size"} onClick={() => addCircle(i)}>
                <Plus size={16} />
              </button>
            </div>

            {cur && (
              <div className="vf-panel">
                <div className="vf-panel-row">
                  {g.type === "color" && (
                    <input type="color" value={cur.hex || "#000000"} aria-label="Color"
                      onChange={(e) => patchValue(i, sel.v, { hex: e.target.value })} />
                  )}
                  <input value={cur.label} placeholder={g.type === "color" ? "Color name (Black)" : "Size (M, XL, 42...)"}
                    onChange={(e) => patchValue(i, sel.v, { label: e.target.value })} />
                </div>
                <label className="check">
                  <input type="checkbox" checked={!!cur.soldOut} onChange={(e) => patchValue(i, sel.v, { soldOut: e.target.checked })} />
                  Sold out
                </label>
                <div className="vf-panel-row">
                  <button type="button" className="btn btn-ghost danger" onClick={() => removeValue(i, sel.v)}><Trash2 size={14} /> Remove</button>
                  <button type="button" className="btn" onClick={() => setSel(null)}>Done</button>
                </div>
              </div>
            )}

            <small className="muted">
              {g.values.length === 0 ? "Press the + circle to add the first one." : "Click a circle to rename it, change its color or mark it sold out."}
            </small>
          </div>
        );
      })}

      {!(hasColor && hasSize) && (
        <div className="vf-add-row">
          <button type="button" className="vf-plus" aria-label="Add options" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Plus size={16} />
          </button>
          {!menu && <span className="muted">Add colors or sizes</span>}
          {menu && (
            <div className="vf-menu">
              {!hasColor && <button type="button" className="btn" onClick={() => addGroup("color")}>Color circles</button>}
              {!hasSize && <button type="button" className="btn" onClick={() => addGroup("size")}>Size circles</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Customer-facing picker. Use it on the product card / product page in StoreView.
 * selected: { color?: "Black", size?: "M" }
 * A circle marked "sold out" is crossed out and cannot be chosen.
 */
export function VariantPicker({ options = [], selected = {}, onSelect }) {
  if (!options.length) return null;
  const anyOut = options.some((g) => g.values.some((v) => v.soldOut));
  return (
    <div className="variant-picker">
      {options.map((g) => (
        <div key={g.type} className="swatches" role="radiogroup" aria-label={g.type}>
          {g.values.map((v, j) => {
            const on = selected[g.type] === v.label && !v.soldOut;
            return (
              <button key={`${v.label}-${j}`} type="button" role="radio" aria-checked={on}
                disabled={!!v.soldOut} title={v.soldOut ? `${v.label} - sold out` : v.label}
                className={`${g.type === "color" ? "swatch" : "swatch swatch-size"}${on ? " is-on" : ""}${v.soldOut ? " is-out" : ""}`}
                style={g.type === "color" ? { background: v.hex } : undefined}
                onClick={() => onSelect(g.type, v.label)}>
                {g.type === "size" ? v.label : ""}
              </button>
            );
          })}
        </div>
      ))}
      {anyOut && <p className="vf-legend">Crossed-out options are sold out.</p>}
    </div>
  );
}
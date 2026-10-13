import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { FONT_OPTIONS, readableOn } from "../../lib/utils.js";
import { DEFAULT_DISCOUNT, priceProduct } from "../../lib/pricing.js";
import ImageField from "../../components/ImageField.jsx";
import StoreView from "../../components/StoreView.jsx";
import Watermark from "../../components/Watermark.jsx";
import { useStoreTheme } from "../store/StoreLayout.jsx";

const uid = () => Math.random().toString(36).slice(2, 9);

// Make sure older stores (without the new columns) still work.
const normalize = (s) => ({
  ...s,
  bg_color: s.bg_color ?? "",
  offers: s.offers ?? [],
  discount: { ...DEFAULT_DISCOUNT, ...(s.discount || {}) },
});

function Scope({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">All products</option>
      <option value="selected">Selected products</option>
    </select>
  );
}

function ProductPicker({ products, selected, onChange }) {
  if (!products.length) return <small className="muted">Add products first, then pick them here.</small>;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="picker">
      {products.map((p) => (
        <label key={p.id} className="check">
          <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
          <span>{p.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function Customize() {
  const { store, setStore, user } = useOutletContext();
  const base = useMemo(() => normalize(store), [store]);
  const [draft, setDraft] = useState(base);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k, v) => { setMsg(""); setDraft((d) => ({ ...d, [k]: v })); };
  useStoreTheme(draft.font);

  useEffect(() => {
    supabase.from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data || []));
  }, [store.id]);

  async function save() {
    setBusy(true);
    const { id, owner_id, created_at, slug, ...fields } = draft;
    const clean = {
      ...fields,
      bg_color: fields.bg_color || null,
      offers: fields.offers.filter((o) => o.buy > 0 && o.free > 0),
    };
    const { data, error } = await supabase.from("stores").update(clean).eq("id", store.id).select().single();
    setBusy(false);
    if (error) return setMsg(error.message);
    setStore(data);
    setMsg("Saved.");
  }

  // --- discount ---
  const d = draft.discount;
  const setDiscount = (patch) => set("discount", { ...d, ...patch });

  // --- offers ---
  const setOffer = (id, patch) => set("offers", draft.offers.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const addOffer = () =>
    set("offers", [...draft.offers, { id: uid(), buy: 2, free: 1, scope: "all", product_ids: [] }]);
  const removeOffer = (id) => set("offers", draft.offers.filter((o) => o.id !== id));

  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const bgInk = draft.bg_color ? readableOn(draft.bg_color) : undefined;
  const themeStyle = {
    "--s-primary": draft.primary_color,
    "--s-primary-ink": readableOn(draft.primary_color),
    "--s-accent": draft.accent_color,
    "--s-accent-ink": readableOn(draft.accent_color),
    "--s-font": `'${draft.font}', 'Hanken Grotesk', sans-serif`,
    ...(draft.bg_color ? { "--s-bg": draft.bg_color, "--s-ink": bgInk, background: draft.bg_color, color: bgInk } : {}),
  };
  const previewProducts = products.slice(0, 8).map((p) => priceProduct(p, draft));

  return (
    <>
      <div className="page-head">
        <h1>Customize</h1>
        <div className="head-actions">
          {msg && <span className={msg === "Saved." ? "muted" : "danger"}>{msg}</span>}
          <button className="btn btn-primary" onClick={save} disabled={busy || !dirty}>{busy ? "Saving..." : "Save changes"}</button>
        </div>
      </div>

      <div className="customize">
        <div className="customize-form">
          <label className="check publish">
            <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
            <span><strong>Store is public</strong><small>vintrexshop.com/store/{store.slug}</small></span>
          </label>

          <fieldset className="cz-section">
            <legend>Store info</legend>
            <label>Store name<input value={draft.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label>Tagline<input value={draft.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Streetwear made in Tunis" /></label>
            <label>Email for new-order alerts
              <input type="email" value={draft.notify_email || ""} onChange={(e) => set("notify_email", e.target.value)} placeholder="Leave empty to use your login email" />
            </label>
            <label>Phone (shown to customers)<input value={draft.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+216 20 000 000" /></label>
          </fieldset>

          <fieldset className="cz-section">
            <legend>Look and feel</legend>
            <ImageField label="Logo" shape="square" value={draft.logo_url} onChange={(v) => set("logo_url", v)} userId={user.id} />
            <ImageField label="Banner" value={draft.banner_url} onChange={(v) => set("banner_url", v)} userId={user.id} />

            <div className="row-2">
              <label>Main color<input type="color" value={draft.primary_color} onChange={(e) => set("primary_color", e.target.value)} /></label>
              <label>Button color<input type="color" value={draft.accent_color} onChange={(e) => set("accent_color", e.target.value)} /></label>
            </div>

            <div className="bg-row">
              <label>Background color
                <input type="color" value={draft.bg_color || "#ffffff"} onChange={(e) => set("bg_color", e.target.value)} />
              </label>
              {draft.bg_color && (
                <button type="button" className="btn btn-ghost" onClick={() => set("bg_color", "")}>Reset to default</button>
              )}
            </div>

            <label>Font
              <select value={draft.font} onChange={(e) => set("font", e.target.value)}>
                {FONT_OPTIONS.map((f) => <option key={f.name}>{f.name}</option>)}
              </select>
            </label>

            <label>Top section
              <select value={draft.hero_style} onChange={(e) => set("hero_style", e.target.value)}>
                <option value="banner">Banner image</option>
                <option value="minimal">Name only</option>
              </select>
            </label>

            <label>Product size: {draft.card_size ?? 260}px
              <input type="range" min="160" max="420" step="10" value={draft.card_size ?? 260} onChange={(e) => set("card_size", Number(e.target.value))} />
              <small className="muted">Smaller sizes fit more products per row.</small>
            </label>
            <label>Product photo shape
              <select value={draft.image_ratio ?? "portrait"} onChange={(e) => set("image_ratio", e.target.value)}>
                <option value="portrait">Portrait (tall)</option>
                <option value="square">Square</option>
                <option value="landscape">Landscape (wide)</option>
              </select>
            </label>

            <label className="check"><input type="checkbox" checked={draft.show_categories} onChange={(e) => set("show_categories", e.target.checked)} /> Show category filter</label>
          </fieldset>

          <fieldset className="cz-section">
            <legend>Discount</legend>
            <label className="check">
              <input type="checkbox" checked={d.enabled} onChange={(e) => setDiscount({ enabled: e.target.checked })} />
              <span><strong>Run a discount</strong><small>Customers see the old price crossed out.</small></span>
            </label>
            {d.enabled && (
              <>
                <div className="row-2">
                  <label>Type
                    <select value={d.type} onChange={(e) => setDiscount({ type: e.target.value })}>
                      <option value="percent">Percent off (%)</option>
                      <option value="fixed">Fixed amount off (TND)</option>
                    </select>
                  </label>
                  <label>Value
                    <input type="number" min="0" max={d.type === "percent" ? 100 : undefined} step="any" value={d.value}
                      onChange={(e) => setDiscount({ value: Number(e.target.value) })} />
                  </label>
                </div>
                <label>Applies to<Scope value={d.scope} onChange={(v) => setDiscount({ scope: v })} /></label>
                {d.scope === "selected" && (
                  <ProductPicker products={products} selected={d.product_ids} onChange={(ids) => setDiscount({ product_ids: ids })} />
                )}
              </>
            )}
          </fieldset>

          <fieldset className="cz-section">
            <legend>Offers</legend>
            <small className="muted">Example: buy 2, get 3 free.</small>
            {draft.offers.map((o) => (
              <div key={o.id} className="offer-card">
                <div className="offer-line">
                  <span>Buy</span>
                  <input type="number" min="1" value={o.buy} onChange={(e) => setOffer(o.id, { buy: Math.max(1, Number(e.target.value)) })} />
                  <span>get</span>
                  <input type="number" min="1" value={o.free} onChange={(e) => setOffer(o.id, { free: Math.max(1, Number(e.target.value)) })} />
                  <span>free</span>
                  <button type="button" className="btn btn-ghost danger" onClick={() => removeOffer(o.id)}>Remove</button>
                </div>
                <label>Applies to<Scope value={o.scope} onChange={(v) => setOffer(o.id, { scope: v })} /></label>
                {o.scope === "selected" && (
                  <ProductPicker products={products} selected={o.product_ids} onChange={(ids) => setOffer(o.id, { product_ids: ids })} />
                )}
              </div>
            ))}
            <button type="button" className="btn" onClick={addOffer}>Add an offer</button>
          </fieldset>
        </div>

        <div className="preview-frame">
          <div className="preview-bar">Live preview</div>
          <div className="store-root" style={themeStyle}>
            <header className="s-header">
              <span className="s-brand">
                {draft.logo_url && <img src={draft.logo_url} alt="" />}
                {draft.name}
              </span>
            </header>
            <StoreView store={draft} products={previewProducts} />
            <Watermark />
          </div>
        </div>
      </div>
    </>
  );
}
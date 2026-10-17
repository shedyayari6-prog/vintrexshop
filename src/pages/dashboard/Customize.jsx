import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { FONT_OPTIONS, readableOn } from "../../lib/utils.js";
import { DEFAULT_DISCOUNT, priceProduct } from "../../lib/pricing.js";
import { seedDemoProducts, removeDemoProducts } from "../../lib/demo.js";
import ImageField from "../../components/ImageField.jsx";
import StoreView, { DEFAULT_FAQS } from "../../components/StoreView.jsx";
import { Announcement, StoreHeader, StoreFooter, uniqueCategories } from "../../components/StoreChrome.jsx";
import "../../store.css";
import Watermark from "../../components/Watermark.jsx";
import { useStoreTheme } from "../store/StoreLayout.jsx";

const uid = () => Math.random().toString(36).slice(2, 9);

// Make sure older stores (without the new columns) still work.
const normalize = (s) => ({
  ...s,
  bg_color: s.bg_color ?? "",
  announcement: s.announcement ?? "",
  hero_eyebrow: s.hero_eyebrow ?? "",
  hero_title: s.hero_title ?? "",
  show_faq: s.show_faq ?? true,
  faqs: s.faqs?.length ? s.faqs : DEFAULT_FAQS,
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

  const loadProducts = () =>
    supabase.from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data || []));
  useEffect(() => { loadProducts(); }, [store.id]);

  // --- sample products ---
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMsg, setDemoMsg] = useState("");
  const demoCount = products.filter((p) => p.is_demo).length;
  async function runDemo(action) {
    if (action === "remove" && !window.confirm("Delete all sample products? Products you added yourself stay.")) return;
    setDemoBusy(true);
    setDemoMsg("");
    const err = await (action === "add" ? seedDemoProducts(supabase, store.id) : removeDemoProducts(supabase, store.id));
    setDemoBusy(false);
    if (err) return setDemoMsg(err.message);
    await loadProducts();
  }

  async function save() {
    setBusy(true);
    const { id, owner_id, created_at, slug, ...fields } = draft;
    const clean = {
      ...fields,
      bg_color: fields.bg_color || null,
      offers: fields.offers.filter((o) => o.buy > 0 && o.free > 0),
      announcement: fields.announcement || null,
      hero_eyebrow: fields.hero_eyebrow || null,
      hero_title: fields.hero_title || null,
      faqs: fields.faqs.filter((f) => f.q.trim() && f.a.trim()),
    };
    const { data, error } = await supabase.from("stores").update(clean).eq("id", store.id).select().single();
    setBusy(false);
    if (error) return setMsg(error.message);
    setStore(data);
    setMsg("Saved.");
  }

  // --- questions ---
  const setFaq = (i, patch) => set("faqs", draft.faqs.map((f, n) => (n === i ? { ...f, ...patch } : f)));
  const addFaq = () => set("faqs", [...draft.faqs, { q: "", a: "" }]);
  const removeFaq = (i) => set("faqs", draft.faqs.filter((_, n) => n !== i));

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
  const previewProducts = products.slice(0, 12).map((p) => priceProduct(p, draft));

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
            <legend>Sample products</legend>
            <small className="muted">
              {products.length === 0
                ? "Your store is empty. Add example products to see how it looks, then edit or delete them in Products."
                : demoCount > 0
                  ? `${demoCount} sample products are in your store. Edit or delete them in Products, or remove them all here.`
                  : "Add 6 example products (tees, hoodies, cap...) to preview your design."}
            </small>
            <div className="variant-actions">
              {demoCount === 0 && <button type="button" className="btn" onClick={() => runDemo("add")} disabled={demoBusy}>{demoBusy ? "Working..." : "Add sample products"}</button>}
              {demoCount > 0 && <button type="button" className="btn btn-ghost danger" onClick={() => runDemo("remove")} disabled={demoBusy}>{demoBusy ? "Working..." : "Remove sample products"}</button>}
            </div>
            {demoMsg && <p className="msg msg-error" role="alert">{demoMsg}</p>}
          </fieldset>

          <fieldset className="cz-section">
            <legend>Store info</legend>
            <label>Store name<input value={draft.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label>Tagline<input value={draft.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Streetwear made in Tunis" /></label>
            <label>Email for new-order alerts
              <input type="email" value={draft.notify_email || ""} onChange={(e) => set("notify_email", e.target.value)} placeholder="Leave empty to use your login email" />
            </label>
            <label>Top banner message<input value={draft.announcement || ""} onChange={(e) => set("announcement", e.target.value)} placeholder="Free delivery on orders over 100 TND" /></label>
            <label>Small text above the title<input value={draft.hero_eyebrow || ""} onChange={(e) => set("hero_eyebrow", e.target.value)} placeholder="New collection 2026" /></label>
            <label>Big title (leave empty to use the store name)<input value={draft.hero_title || ""} onChange={(e) => set("hero_title", e.target.value)} placeholder="Streetwear that tells your story" /></label>
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
            <legend>Questions and answers</legend>
            <label className="check"><input type="checkbox" checked={draft.show_faq} onChange={(e) => set("show_faq", e.target.checked)} /> Show questions section</label>
            {draft.show_faq && (
              <>
                {draft.faqs.map((f, i) => (
                  <div key={i} className="offer-card">
                    <label>Question<input value={f.q} onChange={(e) => setFaq(i, { q: e.target.value })} /></label>
                    <label>Answer<textarea rows={2} value={f.a} onChange={(e) => setFaq(i, { a: e.target.value })} /></label>
                    <button type="button" className="btn btn-ghost danger" onClick={() => removeFaq(i)}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn" onClick={addFaq}>Add a question</button>
              </>
            )}
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
            <Announcement text={draft.announcement} />
            <StoreHeader store={draft} categories={uniqueCategories(products)} />
            <main className="s-main">
              <StoreView store={draft} products={previewProducts} />
            </main>
            <StoreFooter store={draft} categories={uniqueCategories(products)} />
            <Watermark />
          </div>
        </div>
      </div>
    </>
  );
}
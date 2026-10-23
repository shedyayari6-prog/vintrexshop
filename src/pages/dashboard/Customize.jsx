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

// The "saved" message is compared below to pick its color, so it lives in one place
const SAVED = "Enregistré.";

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
      <option value="all">Tous les produits</option>
      <option value="selected">Produits sélectionnés</option>
    </select>
  );
}

function ProductPicker({ products, selected, onChange }) {
  if (!products.length) return <small className="muted">Ajoutez d'abord des produits, puis choisissez-les ici.</small>;
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
    if (action === "remove" && !window.confirm("Supprimer tous les produits d'exemple ? Les produits que vous avez ajoutés vous-même sont conservés.")) return;
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
    setMsg(SAVED);
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
        <h1>Personnaliser</h1>
        <div className="head-actions">
          {msg && <span className={msg === SAVED ? "muted" : "danger"}>{msg}</span>}
          <button className="btn btn-primary" onClick={save} disabled={busy || !dirty}>{busy ? "Enregistrement..." : "Enregistrer les modifications"}</button>
        </div>
      </div>

      <div className="customize">
        <div className="customize-form">
          <label className="check publish">
            <input type="checkbox" checked={draft.published} onChange={(e) => set("published", e.target.checked)} />
            <span><strong>La boutique est publique</strong><small>vintrexshop.com/store/{store.slug}</small></span>
          </label>

          <fieldset className="cz-section">
            <legend>Produits d'exemple</legend>
            <small className="muted">
              {products.length === 0
                ? "Votre boutique est vide. Ajoutez des produits d'exemple pour voir le rendu, puis modifiez-les ou supprimez-les dans Produits."
                : demoCount > 0
                  ? `${demoCount} produits d'exemple sont dans votre boutique. Modifiez-les ou supprimez-les dans Produits, ou retirez-les tous ici.`
                  : "Ajoutez 6 produits d'exemple (t-shirts, sweats à capuche, casquette...) pour prévisualiser votre design."}
            </small>
            <div className="variant-actions">
              {demoCount === 0 && <button type="button" className="btn" onClick={() => runDemo("add")} disabled={demoBusy}>{demoBusy ? "Traitement en cours..." : "Ajouter des produits d'exemple"}</button>}
              {demoCount > 0 && <button type="button" className="btn btn-ghost danger" onClick={() => runDemo("remove")} disabled={demoBusy}>{demoBusy ? "Traitement en cours..." : "Retirer les produits d'exemple"}</button>}
            </div>
            {demoMsg && <p className="msg msg-error" role="alert">{demoMsg}</p>}
          </fieldset>

          <fieldset className="cz-section">
            <legend>Informations de la boutique</legend>
            <label>Nom de la boutique<input value={draft.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label>Slogan<input value={draft.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Streetwear conçu à Tunis" /></label>
            <label>E-mail pour les alertes de nouvelle commande
              <input type="email" value={draft.notify_email || ""} onChange={(e) => set("notify_email", e.target.value)} placeholder="Laissez vide pour utiliser votre e-mail de connexion" />
            </label>
            <label>Message de la bannière du haut<input value={draft.announcement || ""} onChange={(e) => set("announcement", e.target.value)} placeholder="Livraison gratuite dès 100 TND d'achat" /></label>
            <label>Petit texte au-dessus du titre<input value={draft.hero_eyebrow || ""} onChange={(e) => set("hero_eyebrow", e.target.value)} placeholder="Nouvelle collection 2026" /></label>
            <label>Grand titre (laissez vide pour utiliser le nom de la boutique)<input value={draft.hero_title || ""} onChange={(e) => set("hero_title", e.target.value)} placeholder="Un streetwear qui raconte votre histoire" /></label>
            <label>Téléphone (affiché aux clients)<input value={draft.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+216 20 000 000" /></label>
          </fieldset>

          <fieldset className="cz-section">
            <legend>Apparence</legend>
            <ImageField label="Logo" shape="square" value={draft.logo_url} onChange={(v) => set("logo_url", v)} userId={user.id} />
            <ImageField label="Bannière" value={draft.banner_url} onChange={(v) => set("banner_url", v)} userId={user.id} />

            <div className="row-2">
              <label>Couleur principale<input type="color" value={draft.primary_color} onChange={(e) => set("primary_color", e.target.value)} /></label>
              <label>Couleur des boutons<input type="color" value={draft.accent_color} onChange={(e) => set("accent_color", e.target.value)} /></label>
            </div>

            <div className="bg-row">
              <label>Couleur d'arrière-plan
                <input type="color" value={draft.bg_color || "#ffffff"} onChange={(e) => set("bg_color", e.target.value)} />
              </label>
              {draft.bg_color && (
                <button type="button" className="btn btn-ghost" onClick={() => set("bg_color", "")}>Rétablir par défaut</button>
              )}
            </div>

            <label>Police
              <select value={draft.font} onChange={(e) => set("font", e.target.value)}>
                {FONT_OPTIONS.map((f) => <option key={f.name}>{f.name}</option>)}
              </select>
            </label>

            <label>Section du haut
              <select value={draft.hero_style} onChange={(e) => set("hero_style", e.target.value)}>
                <option value="banner">Image de bannière</option>
                <option value="minimal">Nom uniquement</option>
              </select>
            </label>

            <label>Taille des produits : {draft.card_size ?? 260}px
              <input type="range" min="160" max="420" step="10" value={draft.card_size ?? 260} onChange={(e) => set("card_size", Number(e.target.value))} />
              <small className="muted">Les tailles plus petites permettent d'afficher plus de produits par ligne.</small>
            </label>
            <label>Forme des photos produits
              <select value={draft.image_ratio ?? "portrait"} onChange={(e) => set("image_ratio", e.target.value)}>
                <option value="portrait">Portrait (haut)</option>
                <option value="square">Carré</option>
                <option value="landscape">Paysage (large)</option>
              </select>
            </label>

            <label className="check"><input type="checkbox" checked={draft.show_categories} onChange={(e) => set("show_categories", e.target.checked)} /> Afficher le filtre par catégorie</label>
          </fieldset>

          <fieldset className="cz-section">
            <legend>Questions et réponses</legend>
            <label className="check"><input type="checkbox" checked={draft.show_faq} onChange={(e) => set("show_faq", e.target.checked)} /> Afficher la section questions</label>
            {draft.show_faq && (
              <>
                {draft.faqs.map((f, i) => (
                  <div key={i} className="offer-card">
                    <label>Question<input value={f.q} onChange={(e) => setFaq(i, { q: e.target.value })} /></label>
                    <label>Réponse<textarea rows={2} value={f.a} onChange={(e) => setFaq(i, { a: e.target.value })} /></label>
                    <button type="button" className="btn btn-ghost danger" onClick={() => removeFaq(i)}>Supprimer</button>
                  </div>
                ))}
                <button type="button" className="btn" onClick={addFaq}>Ajouter une question</button>
              </>
            )}
          </fieldset>

          <fieldset className="cz-section">
            <legend>Remise</legend>
            <label className="check">
              <input type="checkbox" checked={d.enabled} onChange={(e) => setDiscount({ enabled: e.target.checked })} />
              <span><strong>Appliquer une remise</strong><small>Vos clients voient l'ancien prix barré.</small></span>
            </label>
            {d.enabled && (
              <>
                <div className="row-2">
                  <label>Type
                    <select value={d.type} onChange={(e) => setDiscount({ type: e.target.value })}>
                      <option value="percent">Réduction en pourcentage (%)</option>
                      <option value="fixed">Réduction d'un montant fixe (TND)</option>
                    </select>
                  </label>
                  <label>Valeur
                    <input type="number" min="0" max={d.type === "percent" ? 100 : undefined} step="any" value={d.value}
                      onChange={(e) => setDiscount({ value: Number(e.target.value) })} />
                  </label>
                </div>
                <label>S'applique à<Scope value={d.scope} onChange={(v) => setDiscount({ scope: v })} /></label>
                {d.scope === "selected" && (
                  <ProductPicker products={products} selected={d.product_ids} onChange={(ids) => setDiscount({ product_ids: ids })} />
                )}
              </>
            )}
          </fieldset>

          <fieldset className="cz-section">
            <legend>Offres</legend>
            <small className="muted">Exemple : achetez 2, obtenez 3 offerts.</small>
            {draft.offers.map((o) => (
              <div key={o.id} className="offer-card">
                <div className="offer-line">
                  <span>Achetez</span>
                  <input type="number" min="1" value={o.buy} onChange={(e) => setOffer(o.id, { buy: Math.max(1, Number(e.target.value)) })} />
                  <span>obtenez</span>
                  <input type="number" min="1" value={o.free} onChange={(e) => setOffer(o.id, { free: Math.max(1, Number(e.target.value)) })} />
                  <span>offert(s)</span>
                  <button type="button" className="btn btn-ghost danger" onClick={() => removeOffer(o.id)}>Supprimer</button>
                </div>
                <label>S'applique à<Scope value={o.scope} onChange={(v) => setOffer(o.id, { scope: v })} /></label>
                {o.scope === "selected" && (
                  <ProductPicker products={products} selected={o.product_ids} onChange={(ids) => setOffer(o.id, { product_ids: ids })} />
                )}
              </div>
            ))}
            <button type="button" className="btn" onClick={addOffer}>Ajouter une offre</button>
          </fieldset>
        </div>

        <div className="preview-frame">
          <div className="preview-bar">Aperçu en direct</div>
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
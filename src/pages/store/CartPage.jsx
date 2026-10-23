import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../lib/utils.js";
import { lineTotal } from "../../lib/pricing.js";

const variantText = (v = {}) => [v.color && `Couleur ${v.color}`, v.size && `Taille ${v.size}`].filter(Boolean).join(", ");

export default function CartPage() {
  const { store, products, cart, base } = useOutletContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", city: "", address: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Price per product (all colors/sizes of one product count together for offers)
  const qtyById = {};
  cart.items.forEach((i) => { qtyById[i.id] = (qtyById[i.id] || 0) + i.quantity; });
  const lines = Object.entries(qtyById)
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      return product ? { product, qty, ...lineTotal(product, qty, store) } : null;
    })
    .filter(Boolean);
  const info = (id) => lines.find((l) => l.product.id === id);
  const total = lines.reduce((s, l) => s + l.total, 0);
  const freebies = lines.filter((l) => l.freeUnits > 0);

  if (cart.items.length === 0) {
    return (
      <div className="s-empty">
        <h1>Votre panier est vide</h1>
        <Link className="s-btn" to={base}>Parcourir les produits</Link>
      </div>
    );
  }

  async function placeOrder(e) {
    e.preventDefault();
    setError("");
    if (!/^[+\d][\d\s]{6,}$/.test(form.phone.trim())) return setError("Saisissez un numéro de téléphone valide.");
    setBusy(true);
    // Colors/sizes go in the note so the seller sees them (no database change needed)
    const optionLines = cart.items.filter((i) => variantText(i.variant)).map((i) => `${i.name} x${i.quantity} : ${variantText(i.variant)}`);
    const note = [optionLines.length ? `Options - ${optionLines.join("; ")}` : "", form.note].filter(Boolean).join("\n");
    const { error } = await supabase.rpc("place_order", {
      p_store_id: store.id,
      p_name: form.name,
      p_phone: form.phone,
      p_address: form.address,
      p_city: form.city,
      p_note: note,
      p_items: cart.items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
    });
    setBusy(false);
    if (error) return setError(error.message);
    cart.clear();
    navigate(`${base}/thanks`);
  }

  return (
    <div className="s-checkout">
      <section>
        <h1>Votre panier</h1>
        <ul className="cart-list">
          {cart.items.map((i) => {
            const l = info(i.id);
            const unit = l ? l.unit : i.price;
            return (
              <li key={i.key}>
                {i.image_url ? <img src={i.image_url} alt="" /> : <div className="p-img-empty" />}
                <div className="cart-info">
                  <strong>{i.name}</strong>
                  {variantText(i.variant) && <span className="muted">{variantText(i.variant)}</span>}
                  <span>
                    {unit < Number(i.price) && <span className="price-old">{formatPrice(i.price)}</span>}
                    {formatPrice(unit)}
                  </span>
                  <div className="qty qty-sm">
                    <button onClick={() => cart.setQty(i.key, i.quantity - 1)} aria-label="Moins">-</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => cart.setQty(i.key, i.quantity + 1)} aria-label="Plus">+</button>
                  </div>
                </div>
                <button className="icon-btn" onClick={() => cart.remove(i.key)} aria-label={`Retirer ${i.name}`}><Trash2 size={16} /></button>
              </li>
            );
          })}
        </ul>
        {freebies.map((l) => (
          <p key={l.product.id} className="cart-free">{l.freeUnits} offert{l.freeUnits > 1 ? "s" : ""} : {l.product.name}</p>
        ))}
        <p className="cart-total"><span>Total</span><strong>{formatPrice(total)}</strong></p>
      </section>

      <form className="s-form" onSubmit={placeOrder}>
        <h2>Informations de livraison</h2>
        <label>Nom complet<input required value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" /></label>
        <label>Téléphone<input required type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></label>
        <label>Ville<input required value={form.city} onChange={(e) => set("city", e.target.value)} /></label>
        <label>Adresse<input required value={form.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" /></label>
        <label>Note (facultatif)<textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} /></label>
        <p className="muted">Vous payez en espèces à la réception de votre commande.</p>
        {error && <p className="msg msg-error" role="alert">{error}</p>}
        <button className="s-btn s-btn-block" disabled={busy}>{busy ? "Envoi de la commande..." : `Passer la commande - ${formatPrice(total)}`}</button>
      </form>
    </div>
  );
}
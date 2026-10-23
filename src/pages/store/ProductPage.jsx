import { useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { formatPrice } from "../../lib/utils.js";
import { priceProduct } from "../../lib/pricing.js";
import { VariantPicker } from "../../components/VariantsField.jsx";

export default function ProductPage() {
  const { productId } = useParams();
  const { store, products, cart, base } = useOutletContext();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [choice, setChoice] = useState({});
  const raw = products.find((p) => p.id === productId);

  if (!raw) {
    return <div className="s-empty"><p>Produit introuvable.</p><Link to={base}>Retour à la boutique</Link></div>;
  }
  const product = priceProduct(raw, store);
  const options = (product.options || []).filter((g) => g.values && g.values.length);
  const missing = options.find((g) => !choice[g.type]);
  // sold out when the stock is 0, or when every color (or every size) has been marked sold out
  const optionGone = options.some((g) => g.values.every((v) => v.soldOut));
  const soldOut = product.stock <= 0 || optionGone;

  return (
    <div className="s-product">
      <Link to={base} className="s-back">Retour à la boutique</Link>
      <div className="s-product-body">
        <div className="s-product-img">
          {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="p-img-empty" />}
        </div>
        <div className="s-product-info">
          {product.category && <span className="s-chip">{product.category}</span>}
          <h1>{product.name}</h1>
          <p className="s-price">
            {product.sale_price != null ? (
              <>
                <span className="price-old">{formatPrice(product.price)}</span>
                <span className="price-now">{formatPrice(product.sale_price)}</span>
              </>
            ) : formatPrice(product.price)}
          </p>
          {product.offer_labels.length > 0 && (
            <div className="s-offers">
              {product.offer_labels.map((l) => <span key={l} className="s-offer">{l}</span>)}
            </div>
          )}
          {product.description && <p className="s-desc">{product.description}</p>}
          {soldOut ? (
            <p className="danger">Épuisé</p>
          ) : (
            <>
              {options.map((g) => (
                <div key={g.type}>
                  <span className="field-label">{g.type === "color" ? "Couleur" : "Taille"}{choice[g.type] ? ` : ${choice[g.type]}` : ""}</span>
                  <VariantPicker options={[g]} selected={choice} onSelect={(t, v) => setChoice((c) => ({ ...c, [t]: v }))} />
                </div>
              ))}
              <div className="qty">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins">-</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Plus">+</button>
              </div>
              <div className="s-actions">
                <button className="s-btn" disabled={!!missing}
                  onClick={() => { cart.add(raw, qty, choice); navigate(`${base}/cart`); }}>
                  {missing ? (missing.type === "color" ? "Choisissez une couleur" : "Choisissez une taille") : "Ajouter au panier"}
                </button>
              </div>
              {product.stock <= 5 && <small className="muted">Plus que {product.stock} en stock</small>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
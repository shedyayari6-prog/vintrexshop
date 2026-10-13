import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/utils.js";
import { priceProduct } from "../lib/pricing.js";

export const RATIOS = { portrait: "4 / 5", square: "1 / 1", landscape: "4 / 3" };

// `product` must already be priced (see priceProduct) to show sale price and offers.
export function ProductCard({ product, base }) {
  const soldOut = product.stock <= 0;
  const onSale = product.sale_price != null;
  const percentOff = onSale && Number(product.price) > 0 ? Math.round((1 - product.sale_price / Number(product.price)) * 100) : 0;
  const colors = (product.options || []).find((g) => g.type === "color")?.values || [];
  const offer = product.offer_labels?.[0];

  const inner = (
    <>
      <div className="p-img">
        {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="p-img-empty" />}
        {soldOut ? <span className="p-badge">Sold out</span> : offer && <span className="p-badge p-offer">{offer}</span>}
        {onSale && !soldOut && percentOff > 0 && <span className="p-badge p-sale">-{percentOff}%</span>}
      </div>
      <h3>{product.name}</h3>
      <p>
        {onSale ? (
          <>
            <span className="price-old">{formatPrice(product.price)}</span>
            <span className="price-now">{formatPrice(product.sale_price)}</span>
          </>
        ) : formatPrice(product.price)}
      </p>
      {colors.length > 0 && (
        <span className="p-dots" aria-label={`${colors.length} colors`}>
          {colors.slice(0, 6).map((c) => <i key={c.label} title={c.label} style={{ background: c.hex }} />)}
          {colors.length > 6 && <small>+{colors.length - 6}</small>}
        </span>
      )}
    </>
  );
  if (!base) return <div className="p-card">{inner}</div>;
  return <Link className="p-card" to={`${base}/product/${product.id}`}>{inner}</Link>;
}

// Shared by the public store home page and the live preview in the customizer.
export default function StoreView({ store, products, base }) {
  const [category, setCategory] = useState("All");
  const priced = useMemo(() => products.map((p) => priceProduct(p, store)), [products, store]);
  const categories = useMemo(() => {
    const set = new Set(priced.map((p) => p.category).filter(Boolean));
    return ["All", ...set];
  }, [priced]);
  const shown = category === "All" ? priced : priced.filter((p) => p.category === category);

  return (
    <>
      {store.hero_style === "banner" ? (
        <section className="s-hero s-hero-banner" style={store.banner_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.35)), url(${store.banner_url})` } : undefined}>
          <h1>{store.name}</h1>
          {store.tagline && <p>{store.tagline}</p>}
        </section>
      ) : (
        <section className="s-hero s-hero-minimal">
          <h1>{store.name}</h1>
          {store.tagline && <p>{store.tagline}</p>}
        </section>
      )}

      {store.show_categories && categories.length > 2 && (
        <div className="s-cats" role="tablist">
          {categories.map((c) => (
            <button key={c} className={c === category ? "on" : ""} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="s-empty">No products yet.</p>
      ) : (
        <div className="s-grid" style={{ "--card": `${store.card_size ?? 260}px`, "--ratio": RATIOS[store.image_ratio] || RATIOS.portrait }}>
          {shown.map((p) => <ProductCard key={p.id} product={p} base={base} />)}
        </div>
      )}
    </>
  );
}
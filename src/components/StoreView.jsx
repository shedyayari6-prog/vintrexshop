import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Banknote, ChevronDown, Phone, Truck } from "lucide-react";
import { formatPrice } from "../lib/utils.js";
import { priceProduct } from "../lib/pricing.js";

export const RATIOS = { portrait: "4 / 5", square: "1 / 1", landscape: "4 / 3" };

export const DEFAULT_FAQS = [
  { q: "How long does delivery take?", a: "Most orders arrive within 2 to 5 days depending on your city. We call you to confirm before we ship." },
  { q: "How do I pay?", a: "You pay in cash when your order arrives. There is nothing to pay online." },
  { q: "Can I return or exchange an item?", a: "Yes. If something isn't right, call us within 7 days and we'll arrange an exchange." },
  { q: "Can I change my order after placing it?", a: "Call us as soon as you can and we'll update it before it ships." },
];

// `product` must already be priced (see priceProduct) to show sale price and offers.
// `cart` is optional: without it (dashboard preview) the button does nothing.
export function ProductCard({ product, base, cart }) {
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;
  const onSale = product.sale_price != null;
  const percentOff = onSale && Number(product.price) > 0 ? Math.round((1 - product.sale_price / Number(product.price)) * 100) : 0;
  const options = (product.options || []).filter((g) => g.values?.length);
  const colors = options.find((g) => g.type === "color")?.values || [];
  const offer = product.offer_labels?.[0];
  const to = base ? `${base}/product/${product.id}` : undefined;
  const Media = to ? Link : "div";
  const mediaProps = to ? { to } : {};

  function add() {
    if (!base || soldOut) return;
    if (options.length || !cart) return navigate(to);
    cart.add(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="p-card">
      <Media className="p-img" {...mediaProps}>
        {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="p-img-empty" />}
        {soldOut ? <span className="p-badge">Sold out</span> : offer && <span className="p-badge p-offer">{offer}</span>}
        {onSale && !soldOut && percentOff > 0 && <span className="p-badge p-sale">-{percentOff}%</span>}
      </Media>
      <div className="p-body">
        <h3>{to ? <Link to={to}>{product.name}</Link> : product.name}</h3>
        {product.category && <span className="p-cat">{product.category}</span>}
        <div className="p-row">
          <p className="p-price">
            {onSale ? (
              <>
                <span className="price-old">{formatPrice(product.price)}</span>
                <span className="price-now">{formatPrice(product.sale_price)}</span>
              </>
            ) : formatPrice(product.price)}
          </p>
          <button type="button" className="p-add" onClick={add} disabled={soldOut}>
            {soldOut ? "Sold out" : added ? "Added" : options.length ? "Choose options" : "Add to cart"}
          </button>
        </div>
        {colors.length > 0 && (
          <span className="p-dots" aria-label={`${colors.length} colors`}>
            {colors.slice(0, 6).map((c) => <i key={c.label} title={c.label} style={{ background: c.hex }} />)}
            {colors.length > 6 && <small>+{colors.length - 6}</small>}
          </span>
        )}
      </div>
    </article>
  );
}

function Faq({ store, faqs }) {
  return (
    <section className="s-sec s-faq-sec">
      <div className="s-wrap s-faq">
        <div>
          <h2>Frequently asked questions</h2>
          <p className="s-faq-intro">Everything you need to know before ordering from {store.name}.</p>
          {store.phone && <a className="s-link" href={`tel:${store.phone}`}>Call us <ArrowRight size={14} /></a>}
        </div>
        <div className="s-faq-list">
          {faqs.map((f, i) => (
            <details key={i} open={i === 0}>
              <summary>{f.q}<span className="s-faq-chev"><ChevronDown size={14} /></span></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// Shared by the public store home page and the live preview in the customizer.
export default function StoreView({ store, products, base, cart }) {
  const live = Boolean(base);
  const [params, setParams] = useSearchParams();
  const [localCat, setLocalCat] = useState("All");
  const listRef = useRef(null);
  const tilesRef = useRef(null);
  const firstRun = useRef(true);

  const category = live ? params.get("cat") || "All" : localCat;
  const query = (live ? params.get("q") || "" : "").trim().toLowerCase();
  const isFiltered = category !== "All" || Boolean(query);
  const setCategory = (c) => (live ? setParams(c === "All" ? {} : { cat: c }) : setLocalCat(c));

  const priced = useMemo(() => products.map((p) => priceProduct(p, store)), [products, store]);
  const categories = useMemo(() => [...new Set(priced.map((p) => p.category).filter(Boolean))], [priced]);
  const shown = priced.filter((p) =>
    (category === "All" || p.category === category) && (!query || p.name.toLowerCase().includes(query)));

  const tiles = categories.slice(0, 5).map((name) => ({
    name,
    image: priced.find((p) => p.category === name && p.image_url)?.image_url,
  }));
  const showTiles = store.show_categories && tiles.length >= 2 && !isFiltered;
  const featured = priced.filter((p) => p.featured);
  const best = (featured.length ? featured : priced).slice(0, 4);
  const showBest = priced.length > 4 && !isFiltered;
  const faqs = store.faqs?.length ? store.faqs : DEFAULT_FAQS;

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (!isFiltered) return;
    }
    if (live) scrollTo(listRef);
  }, [category, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const banner = store.hero_style === "banner";
  const hasImg = banner && store.banner_url;
  const heroStyle = hasImg
    ? { backgroundImage: `linear-gradient(100deg, rgba(0,0,0,.6), rgba(0,0,0,.12)), url(${store.banner_url})` }
    : undefined;

  const gridStyle = { "--card": `${store.card_size ?? 260}px`, "--ratio": RATIOS[store.image_ratio] || RATIOS.portrait };
  const card = (p) => <ProductCard key={p.id} product={p} base={base} cart={cart} />;

  return (
    <>
      <section className={`s-hero ${banner ? "s-hero-banner" : "s-hero-minimal"}${hasImg ? " has-img" : ""}`} style={heroStyle}>
        <div className="s-wrap">
          <div className="s-hero-copy">
            {store.hero_eyebrow && <span className="s-eyebrow">{store.hero_eyebrow}</span>}
            <h1>{store.hero_title || store.name}</h1>
            {store.tagline && <p>{store.tagline}</p>}
            <div className="s-hero-cta">
              <button type="button" className="s-btn" onClick={() => scrollTo(listRef)}>Shop now <ArrowRight size={16} /></button>
              {showTiles && <button type="button" className="s-btn s-btn-ghost" onClick={() => scrollTo(tilesRef)}>Explore collection</button>}
            </div>
          </div>
        </div>
      </section>

      <div className="s-trust-band">
        <ul className="s-trust">
          <li><span><Truck size={18} /></span><div><strong>Delivery to your door</strong><small>Order in a minute</small></div></li>
          <li><span><Banknote size={18} /></span><div><strong>Pay on delivery</strong><small>Cash when it arrives</small></div></li>
          <li><span><Phone size={18} /></span><div><strong>{store.phone ? "Questions? Call us" : "No account needed"}</strong><small>{store.phone || "Just pick and order"}</small></div></li>
        </ul>
      </div>

      {showTiles && (
        <section className="s-sec" id="categories" ref={tilesRef}>
          <div className="s-wrap">
            <div className="s-sec-head"><h2>Shop by category</h2></div>
            <div className="s-tiles" data-count={tiles.length}>
              {tiles.map((t) => (
                <button key={t.name} type="button" className="s-tile" onClick={() => setCategory(t.name)}>
                  {t.image && <img src={t.image} alt="" loading="lazy" />}
                  <span className="s-tile-label">{t.name}<i><ArrowRight size={14} /></i></span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {showBest && (
        <section className="s-sec">
          <div className="s-wrap">
            <div className="s-sec-head">
              <h2>Best sellers</h2>
              <button type="button" className="s-link" onClick={() => scrollTo(listRef)}>View more <ArrowRight size={14} /></button>
            </div>
            <div className="s-grid" style={gridStyle}>{best.map(card)}</div>
          </div>
        </section>
      )}

      <section className="s-sec" ref={listRef} id="products">
        <div className="s-wrap">
          <div className="s-sec-head">
            <div>
              <h2>{query ? `Results for "${query}"` : category === "All" ? "All products" : category}</h2>
              <small className="muted">{shown.length} {shown.length === 1 ? "item" : "items"}</small>
            </div>
            {isFiltered && live && (
              <button type="button" className="s-link" onClick={() => setParams({})}>Show all <ArrowRight size={14} /></button>
            )}
          </div>
          {shown.length === 0 ? (
            <p className="s-empty">{products.length === 0 ? "No products yet." : "No products match your search."}</p>
          ) : (
            <div className="s-grid" style={gridStyle}>{shown.map(card)}</div>
          )}
        </div>
      </section>

      {store.show_faq !== false && <Faq store={store} faqs={faqs} />}
    </>
  );
}
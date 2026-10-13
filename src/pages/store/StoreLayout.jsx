import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { FONT_OPTIONS, readableOn } from "../../lib/utils.js";
import Watermark from "../../components/Watermark.jsx";

// Loads the seller's chosen Google Font.
export function useStoreTheme(font) {
  useEffect(() => {
    const f = FONT_OPTIONS.find((x) => x.name === font);
    if (!f) return;
    const id = `font-${f.name.replace(/\s/g, "")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${f.css}&display=swap`;
    document.head.appendChild(link);
  }, [font]);
}

const lineKey = (productId, v = {}) => [productId, v.color || "", v.size || ""].join("|");

function useCart(slug) {
  const key = `vintrexshop-cart-${slug}`;
  const [items, setItems] = useState(() => {
    try {
      // old carts have no "key": fall back to the product id
      return (JSON.parse(localStorage.getItem(key)) || []).map((i) => ({ ...i, key: i.key || i.id }));
    } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(items)); }, [items, key]);

  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    add: (product, qty = 1, variant = {}) =>
      setItems((cur) => {
        const k = lineKey(product.id, variant);
        const found = cur.find((i) => i.key === k);
        if (found) {
          return cur.map((i) => i.key === k ? { ...i, quantity: Math.min(i.quantity + qty, product.stock) } : i);
        }
        return [...cur, { key: k, id: product.id, variant, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock, quantity: Math.min(qty, product.stock) }];
      }),
    setQty: (k, quantity) =>
      setItems((cur) => cur.map((i) => i.key === k ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i)),
    remove: (k) => setItems((cur) => cur.filter((i) => i.key !== k)),
    clear: () => setItems([]),
  };
}

export default function StoreLayout() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | missing
  const cart = useCart(slug);
  useStoreTheme(store?.font);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState("loading");
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).eq("published", true).maybeSingle();
      if (cancelled) return;
      if (!s) return setState("missing");
      const { data: p } = await supabase.from("products").select("*").eq("store_id", s.id).order("created_at", { ascending: false });
      if (cancelled) return;
      setStore(s);
      setProducts(p || []);
      setState("ready");
      document.title = s.name;
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state === "loading") return <div className="center-note">Loading store...</div>;
  if (state === "missing") {
    return (
      <div className="center-note">
        <h1>Store not found</h1>
        <p>This store doesn't exist or isn't public yet.</p>
        <Link to="/" className="btn btn-primary">Go to VintrexShop</Link>
      </div>
    );
  }

  const base = `/store/${store.slug}`;
  const bgInk = store.bg_color ? readableOn(store.bg_color) : undefined;
  const themeStyle = {
    "--s-primary": store.primary_color,
    "--s-primary-ink": readableOn(store.primary_color),
    "--s-accent": store.accent_color,
    "--s-accent-ink": readableOn(store.accent_color),
    "--s-font": `'${store.font}', 'Hanken Grotesk', sans-serif`,
    ...(store.bg_color ? { "--s-bg": store.bg_color, "--s-ink": bgInk } : {}),
  };

  return (
    <div className="store-root" style={themeStyle}>
      <header className="s-header">
        <Link to={base} className="s-brand">
          {store.logo_url && <img src={store.logo_url} alt="" />}
          {store.name}
        </Link>
        <Link to={`${base}/cart`} className="s-cart" aria-label={`Cart, ${cart.count} items`}>
          <ShoppingBag size={20} />
          {cart.count > 0 && <span>{cart.count}</span>}
        </Link>
      </header>
      <main className="s-main">
        <Outlet context={{ store, products, cart, base }} />
      </main>
      <footer className="s-footer">
        <span>{store.name}</span>
        {store.phone && <a href={`tel:${store.phone}`}>{store.phone}</a>}
        <small>Powered by VintrexShop</small>
      </footer>
      <Watermark />
    </div>
  );
}
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, ChevronRight } from "lucide-react";

// `to` is undefined in the dashboard preview, so links render as plain spans there.
function Soft({ to, children, ...rest }) {
  return to ? <Link to={to} {...rest}>{children}</Link> : <span {...rest}>{children}</span>;
}

export const uniqueCategories = (products) => [...new Set(products.map((p) => p.category).filter(Boolean))];

export function Announcement({ text }) {
  if (!text) return null;
  const row = Array.from({ length: 8 }, () => text);
  return (
    <div className="s-announce" role="note" aria-label={text}>
      <div className="s-announce-track" aria-hidden="true">
        {[...row, ...row].map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}

export function StoreHeader({ store, base, categories = [], count = 0 }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const catLink = (c) => base && `${base}?cat=${encodeURIComponent(c)}`;

  function search(e) {
    e.preventDefault();
    if (!base) return;
    navigate(term.trim() ? `${base}?q=${encodeURIComponent(term.trim())}` : base);
  }

  return (
    <header className="s-header">
      <div className="s-header-in">
        <Soft to={base} className="s-brand">
          {store.logo_url && <img src={store.logo_url} alt="" />}
          {store.name}
        </Soft>

        <nav className="s-nav" aria-label="Categories">
          {categories.slice(0, 4).map((c) => <Soft key={c} to={catLink(c)}>{c}</Soft>)}
          {categories.length > 4 && (
            <Soft to={base && `${base}#categories`} className="s-nav-more" aria-label="More categories"><ChevronRight size={14} /></Soft>
          )}
        </nav>

        <form className="s-hsearch" onSubmit={search} role="search">
          <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products..." aria-label="Search products" />
          <button type="submit" aria-label="Search"><Search size={16} /></button>
        </form>

        <Soft to={base && `${base}/cart`} className="s-cart" aria-label={`Cart, ${count} items`}>
          <ShoppingBag size={20} />
          {count > 0 && <span>{count}</span>}
        </Soft>
      </div>
    </header>
  );
}

export function StoreFooter({ store, base, categories = [] }) {
  const catLink = (c) => base && `${base}?cat=${encodeURIComponent(c)}`;
  return (
    <footer className="s-footer">
      <div className="s-wrap s-footer-grid">
        <div>
          <Soft to={base} className="s-brand">{store.name}</Soft>
          {store.tagline && <p className="s-footer-blurb">{store.tagline}</p>}
        </div>
        {categories.length > 0 && (
          <div>
            <h4>Shop</h4>
            <ul>{categories.slice(0, 6).map((c) => <li key={c}><Soft to={catLink(c)}>{c}</Soft></li>)}</ul>
          </div>
        )}
        <div>
          <h4>Contact</h4>
          <ul>
            {store.phone ? <li><a href={`tel:${store.phone}`}>{store.phone}</a></li> : <li>Order online, pay on delivery</li>}
          </ul>
        </div>
      </div>
      <div className="s-wrap s-footer-bottom">
        <span>&copy; {new Date().getFullYear()} {store.name}</span>
        <small>Powered by VintrexShop</small>
      </div>
    </footer>
  );
}

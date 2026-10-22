import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Banknote, Palette, PackageCheck,
  Shirt, Watch, Headphones, Coffee, Gift, Truck, Smartphone, Footprints, Glasses, Gem, Backpack, Lamp,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { useSeo } from "../lib/seo.js";
import Brand from "../components/Brand.jsx";
import GridMotion from "../components/react-bits/GridMotion.jsx";
import CircularCarousel from "../components/react-bits/CircularCarousel.jsx";
import "../landing.css";

// If an animated piece ever fails, show a fallback (or nothing) instead of a blank screen.
class SafeBackground extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("Animated component failed:", error); }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children; }
}

/* ------------------------------------------------------------------ */
/* Speed helpers                                                       */
/* ------------------------------------------------------------------ */

// Phones narrower than this get a plain hero background. The moving photo wall is heavy for a phone.
const WALL_MIN_WIDTH = 761;

// True a moment after the page has painted, so the wall never delays the headline. Never true on phones.
function useWallReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.innerWidth < WALL_MIN_WIDTH) return undefined;
    const start = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 700);
    return () => clearTimeout(id);
  }, []);
  return ready;
}

// True once the element is close to the screen. Used to load the store ring only when it is about to be seen.
function useInView(rootMargin = "400px") {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return [ref, seen];
}

const STEPS = [
  { t: "Create your store", d: "Sign up with your email and choose the name and address of your shop." },
  { t: "Add your products", d: "Upload photos, set prices and stock, and add colors and sizes where they matter." },
  { t: "Share your link", d: "Send it on Instagram, Facebook or WhatsApp. Customers pick a product and order in a minute." },
  { t: "Confirm and deliver", d: "Each order arrives in your dashboard with the phone number and address. Call, confirm, ship." },
];

const FEATURES = [
  { icon: Palette, t: "Looks like your brand", d: "Logo, banner, colors, font, product photo shape and an announcement bar. Every change shows live before you publish." },
  { icon: PackageCheck, t: "Orders in one place", d: "No more orders lost in direct messages. Stock goes down by itself every time someone orders." },
  { icon: Banknote, t: "Cash on delivery", d: "Your customers pay when the package arrives, so nobody needs a bank card to buy from you." },
];

const FAQ = [
  { q: "Is VintrexShop free?", a: "You can open a store and start selling without paying to get started. If prices change, we will say so on this page before it affects you." },
  { q: "How do my customers pay?", a: "They pay you in cash when the order is delivered. VintrexShop does not handle payments and does not take a cut of your sales." },
  { q: "Do I need a website or a domain?", a: "No. Your store gets its own address, like vintrexshop.com/store/your-shop, ready to share." },
  { q: "Can I run discounts and offers?", a: "Yes. Set a percentage or fixed discount, or an offer like buy 2, get 1 free, for all products or only the ones you pick." },
  { q: "Who sees my customers' details?", a: "Only you, in your dashboard. Read our privacy policy for exactly what we store and why." },
];

/* ------------------------------------------------------------------ */
/* Moving wall in the hero                                             */
/* Put your photos in  src/assets/hero/  (.jpg .png .webp .avif).      */
/* They are picked up automatically and shown in filename order, so    */
/* name them 01-..., 02-..., 03-... to control where each one goes.    */
/* Defined once, outside the component, so the wall doesn't restart.   */
/* ------------------------------------------------------------------ */
const heroPhotos = Object.entries(
  import.meta.glob("../assets/hero/*.{jpg,jpeg,png,webp,avif}", { eager: true, import: "default" })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

const PHOTO_TILES = heroPhotos.map((src) => (
  <div key={src} className="gm-tile gm-photo">
    <img src={src} alt="" decoding="async" draggable="false" />
  </div>
));

// Used only when the hero folder has no photos yet, so the page never looks empty
const ICON_TILES = [
  [Shirt, "Fashion", "#0F4C5C", "#2A8296"],
  [Watch, "Watches", "#B8740E", "#E3A33A"],
  [Headphones, "Audio", "#1F4E8C", "#4D82C8"],
  [Coffee, "Home & coffee", "#8A3A28", "#C8553D"],
  [Gift, "Gifts", "#7A3E65", "#B0679A"],
  [Truck, "Delivery", "#17212B", "#3C4C5C"],
  [Smartphone, "Phones", "#0A3641", "#1E6A7E"],
  [Footprints, "Sneakers", "#2F7D4F", "#5BAF7C"],
  [Glasses, "Eyewear", "#5B4B8A", "#8C7CC0"],
  [Gem, "Jewelry", "#A0415B", "#D4728A"],
  [Backpack, "Bags", "#4A5A2A", "#7E9250"],
  [Lamp, "Lighting", "#8C5A10", "#C98F2E"],
].map(([Icon, label, c1, c2]) => (
  <div key={label} className="gm-tile" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
    <span className="gm-icon"><Icon size={38} strokeWidth={1.6} /></span>
    <span className="gm-label">{label}</span>
  </div>
));

const GM_ITEMS = PHOTO_TILES.length > 0 ? PHOTO_TILES : ICON_TILES;

/* ------------------------------------------------------------------ */
/* Popular stores: 3D ring (React Bits CircularCarousel)               */
/* ------------------------------------------------------------------ */

// A picture for each store card: its banner, else its logo, else a colored card with its name.
function storeImage(store) {
  if (store.banner_url) return store.banner_url;
  if (store.logo_url) return store.logo_url;
  const color = /^#[0-9a-f]{6}$/i.test(store.primary_color || "") ? store.primary_color : "#0F4C5C";
  const name = (store.name || "").slice(0, 22).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="650"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="700" font-size="64" fill="#ffffff">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Plain grid: used for a single store, or if the 3D ring cannot run.
function StoreGrid({ stores }) {
  return (
    <ul className="lp-stores">
      {stores.map((s) => (
        <li key={s.slug}>
          <Link to={`/store/${s.slug}`} className="lp-store">
            <span className="lp-store-img" style={{ background: s.primary_color || "var(--teal)" }}>
              {s.banner_url && <img src={s.banner_url} alt="" loading="lazy" />}
            </span>
            <span className="lp-store-body">
              {s.logo_url ? <img className="lp-store-logo" src={s.logo_url} alt="" width="40" height="40" loading="lazy" /> : <b className="lp-store-logo lp-store-initial">{s.name.slice(0, 1)}</b>}
              <span>
                <strong>{s.name}</strong>
                <small>{s.tagline || "Visit store"}</small>
              </span>
              <ArrowRight size={16} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PopularStores() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const activeRef = useRef(0);
  const [ringRef, ringNear] = useInView();

  useEffect(() => {
    let off = false;
    supabase.rpc("popular_stores", { p_limit: 8 }).then(({ data }) => {
      if (off) return;
      if (data) setStores(data);
      setLoaded(true);
    });
    return () => { off = true; };
  }, []);

  // One card per store. With fewer than 8 stores, they repeat around the ring so it still looks full.
  const ringItems = useMemo(() => {
    const base = stores.map((s) => ({ src: storeImage(s), alt: `${s.name} store`, title: s.name, subtitle: s.tagline || "Visit store", slug: s.slug }));
    if (base.length < 2 || base.length >= 8) return base;
    return Array.from({ length: 8 }, (_, i) => base[i % base.length]);
  }, [stores]);

  // while the stores load, keep the space free so the page below does not jump
  if (!loaded) {
    return (
      <section className="lp-sec lp-wide" aria-hidden="true">
        <div className="lp-wrap"><div style={{ minHeight: 720 }} /></div>
      </section>
    );
  }
  if (!stores.length) return null;
  const ring = stores.length >= 2;
  const current = stores.find((s) => s.slug === ringItems[active]?.slug) || stores[0];

  return (
    <section className="lp-sec lp-wide" aria-labelledby="popular-h">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2 id="popular-h">Popular stores right now</h2>
          <p>
            {ring
              ? "Shops on VintrexShop with the most visitors. Drag the ring, click a store to bring it to the front, click it again to open it."
              : "Shops on VintrexShop with the most visitors. Open one to see what a finished store looks like."}
          </p>
        </div>

        {ring ? (
          <>
            <SafeBackground fallback={<StoreGrid stores={stores} />}>
              <div className="lp-ring" ref={ringRef}>
                {ringNear && <CircularCarousel
                  items={ringItems}
                  preset="cylinder"
                  intro="rise"
                  cardWidth={320}
                  aspectRatio={1.3}
                  gap={28}
                  autoplay="step"
                  interval={4}
                  captions
                  fadeColor="#FBFAF7"
                  depthFade={0.5}
                  onChange={(i) => { activeRef.current = i; setActive(i); }}
                  onItemClick={(item, index) => { if (index === activeRef.current) navigate(`/store/${item.slug}`); }}
                />}
              </div>
            </SafeBackground>
            <div className="lp-ring-actions">
              <Link className="btn btn-primary" to={`/store/${current.slug}`}>Visit {current.name} <ArrowRight size={16} /></Link>
              <p className="lp-ring-links">
                All popular stores:{" "}
                {stores.map((s, i) => (
                  <span key={s.slug}>{i > 0 && " · "}<Link to={`/store/${s.slug}`}>{s.name}</Link></span>
                ))}
              </p>
            </div>
          </>
        ) : (
          <StoreGrid stores={stores} />
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const wallReady = useWallReady();
  useSeo({
    title: "VintrexShop - Open Your Online Store, Cash on Delivery",
    description: "Create your own online store in minutes with VintrexShop. Add products, choose your colors, share one link and get paid in cash on delivery.",
    path: "/",
  });
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          {user ? (
            <Link className="btn btn-primary" to="/dashboard">Open dashboard</Link>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">Log in</Link>
              <Link className="btn btn-primary" to="/signup">Open your store</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <div className="hero-wrap">
          <div className="hero-bg" aria-hidden="true" style={{ background: "linear-gradient(135deg, #E7EFF0 0%, #FBFAF7 70%)" }}>
            {wallReady && (
              <SafeBackground>
                <GridMotion items={GM_ITEMS} rows={3} aspectRatio={1.15} gap={14} radius={18} angle={-8}
                  speed={16} direction="alternate" parallax={0.4} spotlight={0.6} dim={0.05} fade={0.25} theme="light" />
              </SafeBackground>
            )}
          </div>
          <section className="landing-hero">
            <h1>Your shop gets its own address.</h1>
            <p className="lead">
              Add your products, pick your colors, share one link. Customers order and pay when the package arrives.
            </p>
            <div className="url-pill" aria-label="Example store address">
              <span>vintrexshop.com/store/</span><strong>urban-wear</strong>
            </div>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" to="/signup">Open your store</Link>
            </div>
          </section>
        </div>

        <PopularStores />

        <section className="lp-sec" aria-labelledby="how-h">
          <div className="lp-wrap">
            <div className="lp-head"><h2 id="how-h">From sign-up to first order</h2></div>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.t}><span>{i + 1}</span><h3>{s.t}</h3><p>{s.d}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lp-sec lp-tint" aria-labelledby="feat-h">
          <div className="lp-wrap">
            <div className="lp-head"><h2 id="feat-h">Built for small sellers who deliver</h2></div>
            <div className="lp-feats">
              {FEATURES.map(({ icon: Icon, t, d }) => (
                <article key={t}><Icon size={22} /><h3>{t}</h3><p>{d}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-sec" aria-labelledby="faq-h">
          <div className="lp-wrap lp-faq">
            <div className="lp-head"><h2 id="faq-h">Questions sellers ask</h2></div>
            <div>
              {FAQ.map((f) => (
                <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-cta">
          <h2>Ready to sell online?</h2>
          <p>Your store can be live in a few minutes.</p>
          <Link className="btn btn-primary btn-lg" to="/signup">Open your store</Link>
        </section>
      </main>

      <footer className="landing-foot">
        <div className="lp-wrap lp-foot">
          <span>&copy; {new Date().getFullYear()} VintrexShop</span>
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms of use</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
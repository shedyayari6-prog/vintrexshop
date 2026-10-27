import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import StoreView from "../../components/StoreView.jsx";
import AdsterraBanner from "../../components/AdsterraBanner.jsx";
import AdsterraScript from "../../components/AdsterraScript.jsx";

/* ---------- Ad units ---------- */
const BANNER_WIDE = {
  adKey: "81943e3815f1e28fac564c175bafacf1",
  scriptUrl: "https://bauval.org/22/81943e3815f1e28fac564c175bafacf1",
  width: 468,
  height: 60,
};
const BANNER_TALL = {
  adKey: "9d76f3e2efac8b952fd45ffe6c0a8b48",
  scriptUrl: "https://bauval.org/22/9d76f3e2efac8b952fd45ffe6c0a8b48",
  width: 160,
  height: 300,
};

// Side ads. To use a bigger size (for example 160x600), create that ad unit in Adsterra
// and replace BANNER_TALL below with its adKey, scriptUrl, width and height.
const SIDE_AD = BANNER_TALL;

// Page-wide formats (popunder / social bar)
const PAGE_SCRIPTS = [
  "https://abscloud.org/1/2de93e4dad3c7662140018dffde39278",
  "https://bauval.org/14/d87183a6216366d7cc76e93b0e617b58",
];

// Side ads only appear when the screen has room for them next to the store
const SIDE_MIN_WIDTH = 1500;
const WIDE_MIN_WIDTH = 520;

function useWidth() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}

const label = { fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.5 };

function SideRail({ side }) {
  return (
    <aside
      aria-label="Publicité"
      style={{
        position: "fixed",
        top: 110,
        [side]: 12,
        width: SIDE_AD.width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        zIndex: 5,
      }}
    >
      <span style={label}>Publicité</span>
      <AdsterraBanner {...SIDE_AD} />
    </aside>
  );
}

export default function StoreHome() {
  const { store, products, base, cart } = useOutletContext();
  const width = useWidth();
  const showSides = width >= SIDE_MIN_WIDTH;
  const wide = width >= WIDE_MIN_WIDTH;
  const bottom = wide ? BANNER_WIDE : BANNER_TALL;

  return (
    <>
      {PAGE_SCRIPTS.map((src) => <AdsterraScript key={src} src={src} />)}

      {showSides && (
        <>
          <SideRail side="left" />
          <SideRail side="right" />
        </>
      )}

      <StoreView store={store} products={products} base={base} cart={cart} />

      {/* Bottom banner: store home page only, not product, cart or checkout */}
      {width > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "32px 16px" }}>
          <span style={label}>Publicité</span>
          <AdsterraBanner {...bottom} />
        </div>
      )}
    </>
  );
}
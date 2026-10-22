// Builds public/sitemap.xml with your fixed pages + every published store.
// Run:  node --env-file=.env scripts/generate-sitemap.mjs
import { writeFileSync } from "node:fs";

const SITE = "https://vintrexshop.com";
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PAGES = ["/", "/signup", "/privacy", "/terms", "/contact"];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

let stores = [];
try {
  const res = await fetch(`${URL}/rest/v1/stores?select=slug&published=eq.true`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase answered ${res.status}`);
  stores = (await res.json()).map((s) => `/store/${s.slug}`);
} catch (err) {
  console.warn("Could not load stores, writing fixed pages only:", err.message);
}

const urls = [...PAGES, ...stores].map((p) => `  <url><loc>${esc(SITE + p)}</loc></url>`).join("\n");
writeFileSync(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);
console.log(`sitemap.xml written: ${PAGES.length + stores.length} URLs`);

import { supabase } from "./supabase";

export function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPrice(n) {
  const v = Number(n || 0);
  return `${v.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
}

export async function uploadImage(file, userId) {
  const ext = file.name.split(".").pop().toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("store-assets")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl;
}

export const FONT_OPTIONS = [
  { name: "Bricolage Grotesque", css: "Bricolage+Grotesque:wght@500;700;800" },
  { name: "Fraunces", css: "Fraunces:wght@500;700" },
  { name: "Space Grotesk", css: "Space+Grotesk:wght@500;700" },
  { name: "DM Serif Display", css: "DM+Serif+Display" },
  { name: "Outfit", css: "Outfit:wght@400;600;700" },
];

export function readableOn(hex) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#17212B" : "#FFFFFF";
}

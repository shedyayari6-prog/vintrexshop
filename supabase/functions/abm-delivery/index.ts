// Supabase Edge Function: sends VintrexShop orders to ABM Delivery.
//
// ONE ABM account belongs to Vintrex. Every parcel is created through it, but the
// sender (ENL_*) is filled with the store owner's own pickup details.
//
// Secrets (npx supabase secrets set ...):
//   ABM_TOKEN                  the "API Token" from the ABM dashboard (preferred)
//   or ABM_USERNAME + ABM_PASSWORD  (the function then calls get_token)
//   ABM_ENV      "test" (default) or "prod"
//   ABM_MR_CODE  optional: payment-mode code for cash on delivery (from ABM mr_list)
//
// Deploy with:  npx supabase functions deploy abm-delivery
// (JWT verification stays ON: only logged-in sellers can call it.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

class Fail extends Error {
  constructor(message: string, public status = 400, public code = "ERROR") {
    super(message);
  }
}

// ---------------------------------------------------------------- ABM client
const BASE =
  (Deno.env.get("ABM_ENV") || "test").toLowerCase() === "prod"
    ? "http://app.abm-delivery.com/WebServiceExterne"
    : "http://app.abm-delivery.com:62/WebServiceExterne";

type Raw = { ok: boolean; status: number; bytes: Uint8Array };

async function abmRaw(path: string, body?: Record<string, unknown>): Promise<Raw> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    console.error("ABM unreachable", path, String(e));
    throw new Fail("ABM Delivery est injoignable pour le moment. Réessayez dans un instant.", 502, "ABM_DOWN");
  }
  return { ok: res.ok, status: res.status, bytes: new Uint8Array(await res.arrayBuffer()) };
}

const text = (r: Raw) => new TextDecoder().decode(r.bytes);
function parse(r: Raw): unknown {
  const t = text(r).trim();
  try { return JSON.parse(t); } catch { return t; }
}

// The ABM docs do not show response shapes, so look keys up defensively.
function findValue(obj: unknown, keyRe: RegExp, depth = 0): string | undefined {
  if (obj == null || depth > 5) return undefined;
  if (Array.isArray(obj)) {
    for (const x of obj) { const v = findValue(x, keyRe, depth + 1); if (v) return v; }
    return undefined;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (keyRe.test(k) && (typeof v === "string" || typeof v === "number") && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    for (const v of Object.values(obj as Record<string, unknown>)) {
      if (typeof v === "object") { const f = findValue(v, keyRe, depth + 1); if (f) return f; }
    }
  }
  return undefined;
}

// ABM answers errors as plain text with HTTP 200, e.g. "INVALID_TOKEN"
const ERR_RE = /invalid|error|erreur|unauthori|denied|expired|incorrect|not[_ ]?found|echec|fail/i;

let tokenCache: { token: string; at: number } | null = null;

async function getToken(force = false): Promise<string> {
  // A fixed token copied from the ABM dashboard (menu "API Token") takes priority.
  const fixed = Deno.env.get("ABM_TOKEN")?.trim();
  if (fixed) return fixed;
  if (!force && tokenCache && Date.now() - tokenCache.at < 10 * 60_000) return tokenCache.token;
  const username = Deno.env.get("ABM_USERNAME");
  const password = Deno.env.get("ABM_PASSWORD");
  if (!username || !password) throw new Fail("ABM Delivery n'est pas configuré sur le serveur.", 500, "NOT_CONFIGURED");

  const r = await abmRaw("get_token", { USERNAME: username, PASSWORD: password });
  const data = parse(r);
  let token: string | undefined;
  if (typeof data === "string") token = data.replace(/^"|"$/g, "").trim();
  else token = findValue(data, /^token$/i) ?? findValue(data, /token/i);
  const masked = (() => {
    try {
      return JSON.stringify(data, (k, v) =>
        typeof v === "string" && (/token|pass/i.test(k) || v.length > 40) ? `${v.slice(0, 3)}...(len ${v.length})` : v);
    } catch { return "unprintable"; }
  })();
  console.log("ABM get_token reply", r.status, r.bytes.length + " bytes", (masked || "").slice(0, 400), "| chosen token len:", token ? token.length : "none");
  if (!r.ok || !token || ERR_RE.test(token)) {
    console.error("ABM get_token failed", r.status, text(r).slice(0, 300));
    throw new Fail("Connexion à ABM Delivery impossible (vérifiez ABM_TOKEN ou ABM_USERNAME / ABM_PASSWORD).", 502, "ABM_AUTH");
  }
  tokenCache = { token, at: Date.now() };
  return token;
}

// POST with the token; if ABM rejects it, fetch a fresh one and retry once.
async function abmAuthed(path: string, fields: Record<string, unknown>): Promise<Raw> {
  let r = await abmRaw(path, { TOKEN: await getToken(), ...fields });
  if (r.status === 401 || r.status === 403 || /invalid[_ ]?token/i.test(text(r))) {
    r = await abmRaw(path, { TOKEN: await getToken(true), ...fields });
  }
  return r;
}

// ------------------------------------------------------------------- helpers
const norm = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Tunisian numbers have 8 digits: drop +216 / 00216
function phone8(p: unknown): string {
  let d = String(p ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("216")) d = d.slice(3);
  return d;
}

const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
const shortId = (id: string) => id.slice(0, 6).toUpperCase();

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

type Gov = { label: string; postal: string };
let govCache: { list: Gov[]; at: number } | null = null;

async function getGovernorates(): Promise<Gov[]> {
  if (govCache && Date.now() - govCache.at < 60 * 60_000) return govCache.list;
  const r = await abmRaw("gouv_list");
  const data = parse(r);
  if (!r.ok || !Array.isArray(data)) {
    console.error("ABM gouv_list unexpected", r.status, text(r).slice(0, 300));
    throw new Fail("Impossible de charger la liste des gouvernorats d'ABM.", 502, "ABM_GOV");
  }
  const list: Gov[] = data
    .map((row: any) => ({
      label: findValue(row, /gouv|lib|nom|name/i) ?? "",
      postal: findValue(row, /post|^cp$|zip/i) ?? "",
    }))
    .filter((g) => g.label);
  if (list.length === 0) {
    console.error("ABM gouv_list parsed empty", text(r).slice(0, 300));
    throw new Fail("Impossible de lire la liste des gouvernorats d'ABM.", 502, "ABM_GOV");
  }
  govCache = { list, at: Date.now() };
  return list;
}

// Customers type a free "city"; try to match it to an ABM governorate.
function guessGov(city: string, list: Gov[]): Gov | undefined {
  const c = norm(city);
  if (!c) return undefined;
  return (
    list.find((g) => norm(g.label) === c) ||
    list.find((g) => c.includes(norm(g.label))) ||
    list.find((g) => norm(g.label).includes(c))
  );
}

// Cash-on-delivery payment mode from ABM mr_list (or the ABM_MR_CODE secret)
async function getMrCode(): Promise<string | undefined> {
  const fixed = Deno.env.get("ABM_MR_CODE");
  if (fixed) return fixed;
  try {
    const r = await abmRaw("mr_list");
    const data = parse(r);
    if (!Array.isArray(data)) return undefined;
    const hit = data.find((row) => /esp[eè]ces?|cash|livraison/i.test(JSON.stringify(row)));
    return hit ? findValue(hit, /^(mr_code|rgmcode)$/i) : undefined;
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------- handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Fail("Non connecté", 401, "AUTH");
    const url = Deno.env.get("SUPABASE_URL")!;

    // Who is calling? Taken from their own login token, never from the request body.
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: userError } = await asUser.auth.getUser();
    if (userError || !user) throw new Fail("Non connecté", 401, "AUTH");
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // Loads an order only if it belongs to the caller (row level security does the check).
    async function myOrder(orderId: unknown) {
      if (!orderId) throw new Fail("Commande manquante", 400);
      const { data } = await asUser
        .from("orders")
        .select("*, order_items(*), stores(*)")
        .eq("id", String(orderId))
        .maybeSingle();
      if (!data) throw new Fail("Commande introuvable", 404, "NOT_FOUND");
      return data as any;
    }

    // ---- governorates (+ a guess for a given city)
    if (action === "governorates") {
      const list = await getGovernorates();
      const guess = guessGov(String(body?.city ?? ""), list);
      return reply({ governorates: list.map((g) => g.label), guess: guess?.label ?? null });
    }

    // ---- send an order to ABM
    if (action === "send") {
      const order = await myOrder(body?.order_id);
      const store = order.stores;
      if (order.abm_barcode) throw new Fail("Cette commande a déjà été envoyée à ABM.", 409, "ALREADY_SENT");
      if (order.status === "cancelled") throw new Fail("Cette commande est annulée.", 400);

      if (!store.pickup_address?.trim() || !store.pickup_postal_code?.trim() || !phone8(store.pickup_phone)) {
        throw new Fail("Renseignez d'abord votre adresse d'enlèvement dans la page Livraison.", 400, "PICKUP_MISSING");
      }

      const govList = await getGovernorates();
      const gov =
        govList.find((g) => norm(g.label) === norm(body?.governorate)) ||
        (body?.governorate ? undefined : guessGov(order.city, govList));
      if (!gov) {
        throw new Fail(
          body?.governorate
            ? "Choisissez le gouvernorat de livraison."
            : "Gouvernorat introuvable à partir de la ville. Envoyez cette commande depuis la page Commandes et choisissez-le.",
          400,
          "GOV_REQUIRED",
        );
      }

      const weight = Math.min(Math.max(Number(body?.weight) || 1, 0.1), 100);
      const pieces = (order.order_items || []).reduce((n: number, i: any) => n + Number(i.quantity || 0), 0) || 1;
      const total = Number(order.total);

      const fields: Record<string, unknown> = {
        ENL_CONTACT_NOM: clip(store.pickup_last_name || store.name, 80),
        ENL_CONTACT_PRENOM: clip(store.pickup_first_name || "Boutique", 80),
        ENL_ADRESSE: clip(store.pickup_address, 250),
        ENL_PORTABLE: phone8(store.pickup_phone),
        ENL_MAIL: clip(store.pickup_email || user.email, 120),
        ENL_CODE_POSTAL: clip(store.pickup_postal_code, 10),

        LIV_CONTACT_NOM: clip(order.customer_name, 80),
        LIV_CONTACT_PRENOM: clip(order.customer_name, 80),
        LIV_ADRESSE: clip(`${order.address}, ${order.city}`, 250),
        LIV_PORTABLE: phone8(order.phone),
        LIV_MAIL: "",
        LIV_CODE_POSTAL: gov.postal,

        POIDS: weight,
        VALEUR: total,
        COD: total,
        RTRNCONTENU: null,
        POSNBPIECE: pieces,
        DATE_ENLEVEMENT: new Date().toLocaleDateString("en-GB", { timeZone: "Africa/Tunis" }), // dd/MM/yyyy
        POSITION_TIME_LIV_DISPO_FROM: "09:00",
        POSITION_TIME_LIV_DISPO_TO: "18:00",
        REFERENCE: `${store.slug}-${shortId(order.id)}`,
        ORDER_NUMBER: shortId(order.id),
        POS_VALID: 1,
        POS_ALLOW_OPEN: body?.allow_open ? 1 : 0,
        GOUVERNORAT: gov.label,
      };
      const mr = await getMrCode();
      if (mr) fields.MR_CODE = mr;

      const r = await abmAuthed("pos_create", fields);
      const data = parse(r);
      console.log("ABM pos_create reply", r.status, text(r).slice(0, 400));
      const bare = typeof data === "string" ? data.replace(/^"|"$/g, "") : "";
      const candidate = /^[A-Za-z0-9_-]{6,40}$/.test(bare) ? bare : findValue(data, /barcode/i);
      const barcode = candidate && !ERR_RE.test(candidate) ? candidate : undefined;

      if (!r.ok || !barcode) {
        console.error("ABM pos_create failed", r.status, text(r).slice(0, 500));
        const reason = findValue(data, /message|error|erreur|msg/i) ?? (typeof data === "string" ? data : "");
        throw new Fail(
          `ABM a refusé le colis${reason ? ` : ${String(reason).slice(0, 200)}` : "."}`,
          502,
          "ABM_REFUSED",
        );
      }

      const patch: Record<string, unknown> = {
        abm_barcode: barcode,
        abm_status: "Envoyé à ABM",
        abm_governorate: gov.label,
        abm_sent_at: new Date().toISOString(),
      };
      if (order.status === "new" || order.status === "confirmed") patch.status = "shipped";
      const { error } = await admin.from("orders").update(patch).eq("id", order.id);
      if (error) {
        // The parcel exists at ABM; make sure the seller still sees the tracking number.
        console.error("Saved-order update failed", barcode, error.message);
        throw new Fail(`Colis créé chez ABM (suivi ${barcode}) mais l'enregistrement a échoué. Contactez le support.`, 500, "SAVE_FAILED");
      }
      return reply({ ok: true, order: { id: order.id, ...patch } });
    }

    // ---- label PDF
    if (action === "label") {
      const order = await myOrder(body?.order_id);
      if (!order.abm_barcode) throw new Fail("Cette commande n'a pas été envoyée à ABM.", 400);
      const path = body?.size === "A5" ? "get_label_zebra" : "get_label";
      const r = await abmAuthed(path, { POSBARCODE: order.abm_barcode });

      let pdf = r.bytes;
      const isPdf = (b: Uint8Array) => b.length > 4 && String.fromCharCode(...b.subarray(0, 4)) === "%PDF";
      if (!isPdf(pdf)) {
        // Some APIs wrap the file as base64 text or JSON
        const inner = parse(r);
        const b64 = typeof inner === "string" ? inner.replace(/^"|"$/g, "") : findValue(inner, /pdf|file|data|label|content/i);
        if (b64) {
          try { pdf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { /* fall through */ }
        }
      }
      if (!r.ok || !isPdf(pdf)) {
        console.error("ABM label failed", r.status, text(r).slice(0, 300));
        throw new Fail("ABM n'a pas renvoyé d'étiquette pour ce colis.", 502, "ABM_LABEL");
      }
      return reply({ pdf_base64: toBase64(pdf) });
    }

    // ---- refresh tracking status for the seller's open ABM parcels
    if (action === "track") {
      const { data: store } = await asUser.from("stores").select("id").eq("owner_id", user.id).maybeSingle();
      if (!store) throw new Fail("Boutique introuvable", 404);
      const { data: rows } = await asUser
        .from("orders")
        .select("id, status, abm_barcode")
        .eq("store_id", store.id)
        .not("abm_barcode", "is", null)
        .not("status", "in", "(delivered,cancelled)")
        .limit(100);
      const open = rows || [];
      if (open.length === 0) return reply({ updated: [] });

      const r = await abmAuthed("get_pos_details_list", { POSBARCODE_LIST: open.map((o) => o.abm_barcode) });
      const data = parse(r);
      if (!r.ok || !Array.isArray(data)) {
        console.error("ABM track failed", r.status, text(r).slice(0, 300));
        throw new Fail("Impossible de lire le suivi depuis ABM.", 502, "ABM_TRACK");
      }

      const byCode = new Map<string, any>();
      for (const row of data) {
        if (row?.STATUS === "FOUND" && row.POS_BARCODE) byCode.set(String(row.POS_BARCODE).trim(), row);
      }

      const updated: Record<string, unknown>[] = [];
      for (const o of open) {
        const row = byCode.get(String(o.abm_barcode).trim());
        if (!row) continue;
        const label = String(row.POS_STATUTACTUEL ?? "").trim();
        const patch: Record<string, unknown> = { abm_synced_at: new Date().toISOString() };
        if (label) patch.abm_status = label;
        if (norm(label) === "colis livre") patch.status = "delivered";
        const { error } = await admin.from("orders").update(patch).eq("id", o.id);
        if (!error) updated.push({ id: o.id, ...patch });
      }
      return reply({ updated });
    }

    throw new Fail("Action inconnue", 400);
  } catch (e) {
    if (e instanceof Fail) return reply({ error: e.message, code: e.code }, e.status);
    console.error("abm-delivery crashed", e);
    return reply({ error: "Une erreur est survenue. Réessayez.", code: "INTERNAL" }, 500);
  }
});
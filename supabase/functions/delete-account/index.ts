// Supabase Edge Function: permanently deletes the logged-in seller's account.
// Deleting the user also deletes their store, products, offers and orders
// (the database tables are linked with "on delete cascade").
// Deploy with:  npx supabase functions deploy delete-account --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization");
  if (!auth) return reply({ error: "Not logged in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;

  // Who is calling? Taken from their own login token, never from the request body.
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user }, error: userError } = await asUser.auth.getUser();
  if (userError || !user) return reply({ error: "Not logged in" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1. delete uploaded images (logo, banner, product photos)
  const bucket = admin.storage.from("store-assets");
  const { data: files } = await bucket.list(user.id, { limit: 1000 });
  if (files && files.length > 0) {
    await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
  }

  // 2. delete the account (cascades to store, products, offers, orders)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return reply({ error: error.message }, 500);

  return reply({ ok: true });
});

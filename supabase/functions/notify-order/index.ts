// Supabase Edge Function: emails the store owner about a new order using Resend.
// Deploy with:  npx supabase functions deploy notify-order --no-verify-jwt
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
const money = (n: unknown) => `${Number(n ?? 0).toFixed(3)} DT`;

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const orderId = payload?.record?.id;
  if (!orderId) return new Response("Missing order id", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();
  if (!order) return new Response("Order not found", { status: 404 });

  const { data: store } = await supabase
    .from("stores")
    .select("name, owner_id, notify_email")
    .eq("id", order.store_id)
    .single();
  if (!store) return new Response("Store not found", { status: 404 });

  let to = (store.notify_email || "").trim();
  if (!to) {
    const { data } = await supabase.auth.admin.getUserById(store.owner_id);
    to = data.user?.email ?? "";
  }
  if (!to) return new Response("No recipient", { status: 200 });

  const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  const from = Deno.env.get("FROM_EMAIL") || "VintrexShop <onboarding@resend.dev>";

  const rows = (order.order_items || [])
    .map(
      (i: any) =>
        `<tr><td style="padding:6px 0">${esc(i.quantity)} x ${esc(i.name)}</td>` +
        `<td style="padding:6px 0;text-align:right">${money(i.price * i.quantity)}</td></tr>`
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#17212B">
    <h2 style="margin:0 0 4px">New order for ${esc(store.name)}</h2>
    <p style="margin:0 0 18px;color:#6B7480">Pay on delivery</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd;border-bottom:1px solid #ddd">${rows}</table>
    <p style="text-align:right;font-size:18px"><strong>Total: ${money(order.total)}</strong></p>
    <h3 style="margin-bottom:6px">Customer</h3>
    <p style="margin:0;line-height:1.6">
      ${esc(order.customer_name)}<br>
      <a href="tel:${esc(order.phone)}">${esc(order.phone)}</a><br>
      ${esc(order.address)}, ${esc(order.city)}
    </p>
    ${order.note ? `<p style="color:#6B7480">Note: ${esc(order.note)}</p>` : ""}
    ${siteUrl ? `<p><a href="${siteUrl}/dashboard/orders" style="display:inline-block;background:#0F4C5C;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open orders</a></p>` : ""}
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New order from ${String(order.customer_name).replace(/[\r\n]/g, " ")} - ${money(order.total)}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return new Response("Email failed", { status: 502 });
  }
  return new Response("ok");
});

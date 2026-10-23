import { useState } from "react";
import { Link } from "react-router-dom";
import { Printer, RefreshCw, Truck } from "lucide-react";
import { supabase } from "../lib/supabase.js";

// Calls the abm-delivery edge function and turns failures into a readable message.
export async function callAbm(body) {
  const { data, error } = await supabase.functions.invoke("abm-delivery", { body });
  if (error) {
    let message = "Service de livraison injoignable.";
    try {
      const payload = await error.context.json();
      if (payload?.error) message = payload.error;
    } catch { /* keep the default message */ }
    const e = new Error(message);
    throw e;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// Fetches the label PDF and opens it in a new tab. Throws a readable Error on failure.
export async function printLabel(orderId, size) {
  // open the tab right away so the popup blocker allows it
  const tab = window.open("", "_blank");
  try {
    const res = await callAbm({ action: "label", order_id: orderId, size });
    const bytes = Uint8Array.from(atob(res.pdf_base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    throw e;
  }
}

export const pickupReady = (store) =>
  Boolean(store.pickup_address?.trim() && store.pickup_postal_code?.trim() && store.pickup_phone?.trim());

// Shipping box shown inside an opened order: send to ABM, print label, see status.
export default function AbmShipping({ order, store, onPatch }) {
  const [open, setOpen] = useState(false);
  const [govs, setGovs] = useState([]);
  const [gov, setGov] = useState("");
  const [weight, setWeight] = useState("1");
  const [allowOpen, setAllowOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function start() {
    setOpen(true);
    setError("");
    if (govs.length) return;
    setBusy("load");
    try {
      const res = await callAbm({ action: "governorates", city: order.city });
      setGovs(res.governorates || []);
      if (res.guess) setGov(res.guess);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  async function send() {
    setError("");
    setBusy("send");
    try {
      const res = await callAbm({
        action: "send",
        order_id: order.id,
        governorate: gov,
        weight: Number(weight) || 1,
        allow_open: allowOpen,
      });
      onPatch(order.id, res.order);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  async function label(size) {
    setError("");
    setBusy("label" + size);
    try {
      await printLabel(order.id, size);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  async function refresh() {
    setError("");
    setBusy("track");
    try {
      const res = await callAbm({ action: "track" });
      (res.updated || []).forEach((u) => onPatch(u.id, u));
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  // ---- already sent
  if (order.abm_barcode) {
    return (
      <div className="abm">
        <div className="abm-head">
          <Truck size={16} /> <strong>ABM Delivery</strong>
          <span className="abm-status">{order.abm_status || "Envoyé"}</span>
        </div>
        <p className="abm-code">Numéro de suivi : <code>{order.abm_barcode}</code></p>
        <div className="abm-actions">
          <button type="button" className="ord-btn" onClick={() => label("A4")} disabled={!!busy}>
            <Printer size={14} /> Étiquette A4
          </button>
          <button type="button" className="ord-btn" onClick={() => label("A5")} disabled={!!busy}>
            <Printer size={14} /> Étiquette A5
          </button>
          <button type="button" className="ord-btn" onClick={refresh} disabled={!!busy}>
            <RefreshCw size={14} className={busy === "track" ? "ord-spin" : ""} /> Actualiser le statut
          </button>
        </div>
        {error && <p className="msg msg-error" role="alert">{error}</p>}
      </div>
    );
  }

  // Nothing to ship for a cancelled order
  if (order.status === "cancelled") return null;

  // ---- not sent yet
  return (
    <div className="abm">
      <div className="abm-head">
        <Truck size={16} /> <strong>ABM Delivery</strong>
        <span className="abm-hint">ABM vient récupérer le colis chez vous et le livre. Le client paie à la livraison.</span>
      </div>

      {!pickupReady(store) ? (
        <p className="abm-note">
          Ajoutez d'abord votre adresse d'enlèvement et votre téléphone. <Link to="/dashboard/delivery">Ouvrir Livraison</Link>
        </p>
      ) : !open ? (
        <div className="abm-actions">
          <button type="button" className="ord-primary" onClick={start}>
            <Truck size={14} /> Livrer avec ABM
          </button>
        </div>
      ) : (
        <div className="abm-form">
          <label>
            Gouvernorat de livraison
            <select value={gov} onChange={(e) => setGov(e.target.value)} disabled={busy === "load"}>
              <option value="">{busy === "load" ? "Chargement..." : "Choisir..."}</option>
              {govs.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label>
            Poids (kg)
            <input type="number" min="0.1" max="100" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <label className="abm-check">
            <input type="checkbox" checked={allowOpen} onChange={(e) => setAllowOpen(e.target.checked)} />
            Le client peut ouvrir le colis avant de payer
          </label>
          <p className="abm-note">
            {order.customer_name} · {order.phone} · {order.address}, {order.city}<br />
            Le client paie <strong>{Number(order.total).toFixed(3)} DT</strong> à la livraison.
          </p>
          <div className="abm-actions">
            <button type="button" className="ord-primary" onClick={send} disabled={!gov || !!busy}>
              {busy === "send" ? "Envoi..." : "Confirmer et envoyer à ABM"}
            </button>
            <button type="button" className="ord-btn" onClick={() => setOpen(false)} disabled={!!busy}>Annuler</button>
          </div>
        </div>
      )}
      {error && <p className="msg msg-error" role="alert">{error}</p>}
    </div>
  );
}
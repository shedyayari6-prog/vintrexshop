import { useState } from "react";
import { supabase } from "../lib/supabase.js";

// Adresse où ABM Delivery récupère vos colis. Envoyée comme expéditeur de chaque colis.
export default function PickupForm({ store, setStore, onSaved }) {
  const [f, setF] = useState({
    pickup_first_name: store.pickup_first_name || "",
    pickup_last_name: store.pickup_last_name || "",
    pickup_address: store.pickup_address || "",
    pickup_postal_code: store.pickup_postal_code || "",
    pickup_phone: store.pickup_phone || "",
    pickup_email: store.pickup_email || "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: false, text: "" });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ ok: false, text: "" });
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
    const { data, error } = await supabase
      .from("stores").update(clean).eq("id", store.id).select().single();
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "Enregistrement impossible : " + error.message });
    setStore(data);
    setMsg({ ok: true, text: "Enregistré." });
    onSaved?.(data);
  }

  return (
    <section className="panel">
      <h2>Adresse d'enlèvement (ABM Delivery)</h2>
      <p className="muted">
        Quand vous envoyez une commande à ABM Delivery, leur livreur vient récupérer le colis à cette adresse.
        Ces informations apparaissent comme expéditeur sur l'étiquette du colis.
      </p>
      <form onSubmit={save} className="pickup-form">
        <label>Prénom<input value={f.pickup_first_name} onChange={(e) => set("pickup_first_name", e.target.value)} placeholder="Facultatif" /></label>
        <label>Nom<input value={f.pickup_last_name} onChange={(e) => set("pickup_last_name", e.target.value)} placeholder={`Par défaut : ${store.name}`} /></label>
        <label className="pickup-wide">Adresse d'enlèvement<input required value={f.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} placeholder="Rue, ville" /></label>
        <label>Code postal<input required inputMode="numeric" value={f.pickup_postal_code} onChange={(e) => set("pickup_postal_code", e.target.value)} placeholder="1000" /></label>
        <label>Téléphone<input required value={f.pickup_phone} onChange={(e) => set("pickup_phone", e.target.value)} placeholder="20 000 000" /></label>
        <label className="pickup-wide">E-mail (facultatif)<input type="email" value={f.pickup_email} onChange={(e) => set("pickup_email", e.target.value)} placeholder="Par défaut : votre e-mail de connexion" /></label>
        {msg.text && (
          <p className={`msg ${msg.ok ? "msg-ok" : "msg-error"} pickup-wide`} role="status">{msg.text}</p>
        )}
        <div className="pickup-wide">
          <button className="btn btn-primary" disabled={busy}>{busy ? "Enregistrement..." : "Enregistrer l'adresse"}</button>
        </div>
      </form>
    </section>
  );
}

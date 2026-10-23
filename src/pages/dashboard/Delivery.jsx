import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { MapPin, Pencil, Printer, RefreshCw, Send, Truck } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../lib/utils.js";
import PickupForm from "../../components/PickupForm.jsx";
import { callAbm, pickupReady, printLabel } from "../../components/AbmShipping.jsx";

const shortId = (id) => String(id).slice(0, 6).toUpperCase();

function dateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-TN", { day: "numeric", month: "short" }) +
    " " +
    d.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function Delivery() {
  const { store, setStore } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(!pickupReady(store));
  const [picked, setPicked] = useState(() => new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (loadError) setError(loadError.message);
    else {
      setError("");
      setOrders(data || []);
    }
    setLoading(false);
  }, [store.id]);

  useEffect(() => { load(); }, [load]);

  const patchOrder = (id, patch) =>
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const ready = useMemo(
    () => orders.filter((o) => !o.abm_barcode && (o.status === "new" || o.status === "confirmed")),
    [orders],
  );
  const shipments = useMemo(
    () =>
      orders
        .filter((o) => o.abm_barcode)
        .sort((a, b) => String(b.abm_sent_at || "").localeCompare(String(a.abm_sent_at || ""))),
    [orders],
  );
  const inTransit = shipments.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const delivered = shipments.filter((o) => o.status === "delivered");
  const cashOnWay = inTransit.reduce((n, o) => n + Number(o.total || 0), 0);

  const ok = pickupReady(store);
  const chosen = ready.filter((o) => picked.has(o.id));
  const allPicked = ready.length > 0 && chosen.length === ready.length;

  function toggle(id) {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendSelected() {
    setSending(true);
    setResults([]);
    setError("");
    const out = [];
    // One by one, so ABM is never hit with a burst
    for (const o of chosen) {
      try {
        const res = await callAbm({ action: "send", order_id: o.id, weight: 1, allow_open: false });
        patchOrder(o.id, res.order);
        out.push({ id: o.id, ok: true, text: "Envoyé à ABM" });
      } catch (e) {
        out.push({ id: o.id, ok: false, text: e.message });
      }
    }
    setResults(out);
    setPicked(new Set());
    setSending(false);
  }

  async function refresh() {
    setBusy("track");
    setError("");
    try {
      const res = await callAbm({ action: "track" });
      (res.updated || []).forEach((u) => patchOrder(u.id, u));
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  async function label(id, size) {
    setBusy(`${id}:${size}`);
    setError("");
    try {
      await printLabel(id, size);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  return (
    <>
      <div className="page-head ord-head">
        <h1>Livraison ABM</h1>
        <button type="button" className="ord-refresh" onClick={refresh} disabled={busy === "track"}>
          <RefreshCw size={15} className={busy === "track" ? "ord-spin" : ""} /> Actualiser les statuts
        </button>
      </div>

      <p className="muted dl-intro">
        ABM Delivery récupère vos colis à votre adresse d'enlèvement et les livre à vos clients.
        Le client paie à la livraison.
      </p>

      {error && <p className="msg msg-error" role="alert">{error}</p>}

      {/* ---------- pickup ---------- */}
      {editing ? (
        <PickupForm
          store={store}
          setStore={setStore}
          onSaved={(s) => { if (pickupReady(s)) setEditing(false); }}
        />
      ) : (
        <section className="panel dl-pickup">
          <MapPin size={18} />
          <div>
            <strong>Adresse d'enlèvement</strong>
            <p>
              {store.pickup_address}, {store.pickup_postal_code} · {store.pickup_phone}
              {(store.pickup_first_name || store.pickup_last_name) &&
                ` · ${[store.pickup_first_name, store.pickup_last_name].filter(Boolean).join(" ")}`}
            </p>
          </div>
          <button type="button" className="ord-btn" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Modifier
          </button>
        </section>
      )}

      {/* ---------- numbers ---------- */}
      <div className="ord-stats">
        <div className="ord-stat">
          <span>Prêts à expédier</span>
          <strong>{ready.length}</strong>
        </div>
        <div className="ord-stat">
          <span>En cours chez ABM</span>
          <strong>{inTransit.length}</strong>
        </div>
        <div className="ord-stat">
          <span>Livrés par ABM</span>
          <strong>{delivered.length}</strong>
        </div>
        <div className="ord-stat">
          <span>Montant à encaisser</span>
          <strong>{formatPrice(cashOnWay)}</strong>
        </div>
      </div>

      {/* ---------- ready to ship ---------- */}
      <section className="panel dl-section">
        <div className="card-head">
          <h2>Prêts à expédier <span className="dl-count">{ready.length}</span></h2>
          <button
            type="button"
            className="ord-primary"
            onClick={sendSelected}
            disabled={!ok || chosen.length === 0 || sending}
          >
            <Send size={14} /> {sending ? "Envoi..." : `Envoyer ${chosen.length || ""} à ABM`.replace("  ", " ")}
          </button>
        </div>

        {!ok && <p className="msg msg-error">Renseignez votre adresse d'enlèvement ci-dessus avant d'envoyer des colis.</p>}

        {loading && orders.length === 0 ? (
          <p>Chargement...</p>
        ) : ready.length === 0 ? (
          <p className="muted">Aucune commande nouvelle ou confirmée en attente. Les nouvelles commandes apparaîtront ici.</p>
        ) : (
          <>
            <label className="dl-row dl-all">
              <input
                type="checkbox"
                checked={allPicked}
                onChange={() => setPicked(allPicked ? new Set() : new Set(ready.map((o) => o.id)))}
              />
              <span>Tout sélectionner</span>
            </label>
            {ready.map((o) => (
              <label className="dl-row" key={o.id}>
                <input type="checkbox" checked={picked.has(o.id)} onChange={() => toggle(o.id)} />
                <span className="dl-main">
                  <strong>{o.customer_name}</strong>
                  <small>#{shortId(o.id)} · {o.city} · {o.phone}</small>
                </span>
                <strong className="dl-amount">{formatPrice(o.total)}</strong>
              </label>
            ))}
            <p className="muted dl-note">
              Le gouvernorat est détecté à partir de la ville du client et le poids est fixé à 1 kg.
              Pour les choisir vous-même, envoyez la commande depuis la page Commandes.
            </p>
          </>
        )}

        {results.length > 0 && (
          <ul className="dl-results">
            {results.map((r) => {
              const o = orders.find((x) => x.id === r.id);
              return (
                <li key={r.id} className={r.ok ? "is-ok" : "is-bad"}>
                  <strong>#{shortId(r.id)}</strong> {o?.customer_name}: {r.text}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- shipments ---------- */}
      <section className="panel dl-section">
        <div className="card-head">
          <h2>Expéditions <span className="dl-count">{shipments.length}</span></h2>
        </div>

        {shipments.length === 0 ? (
          <div className="empty"><p><Truck size={16} /> Aucun colis envoyé pour l'instant. Envoyez votre première commande à ABM ci-dessus.</p></div>
        ) : (
          <div className="dl-table" role="table">
            <div className="dl-th" role="row">
              <span>Suivi</span><span>Client</span><span>Statut</span><span>Montant</span><span>Étiquettes</span>
            </div>
            {shipments.map((o) => (
              <div className="dl-tr" role="row" key={o.id}>
                <span className="dl-track" data-label="Suivi">
                  <code>{o.abm_barcode}</code>
                  <small>#{shortId(o.id)} · {dateTime(o.abm_sent_at)}</small>
                </span>
                <span data-label="Client">
                  <strong>{o.customer_name}</strong>
                  <small>{o.abm_governorate || o.city}</small>
                </span>
                <span data-label="Statut">
                  <span className={`abm-status dl-status ${o.status === "delivered" ? "is-done" : ""}`}>
                    {o.abm_status || "Envoyé"}
                  </span>
                </span>
                <span data-label="Montant"><strong>{formatPrice(o.total)}</strong></span>
                <span className="dl-labels" data-label="Étiquettes">
                  <button type="button" className="ord-btn" onClick={() => label(o.id, "A4")} disabled={!!busy}>
                    <Printer size={14} /> A4
                  </button>
                  <button type="button" className="ord-btn" onClick={() => label(o.id, "A5")} disabled={!!busy}>
                    <Printer size={14} /> A5
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

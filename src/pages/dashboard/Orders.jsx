import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, ChevronDown, Copy, MessageCircle, Phone, RefreshCw, Search } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../lib/utils.js";
import AbmShipping from "../../components/AbmShipping.jsx";

const STATUSES = [
  ["new", "Nouvelle"],
  ["confirmed", "Confirmée"],
  ["shipped", "Expédiée"],
  ["delivered", "Livrée"],
  ["cancelled", "Annulée"],
];
const LABEL = Object.fromEntries(STATUSES);

// The natural next step for an order, shown as one quick button
const NEXT = {
  new: ["confirmed", "Confirmer la commande"],
  confirmed: ["shipped", "Marquer comme expédiée"],
  shipped: ["delivered", "Marquer comme livrée"],
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function dayLabel(iso) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long" });
}

const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });

// Tunisian numbers have 8 digits, so add the country code for WhatsApp
function whatsappLink(phone, text) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = "216" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const shortId = (id) => String(id).slice(0, 6).toUpperCase();
const countItems = (o) => (o.order_items || []).reduce((n, i) => n + i.quantity, 0);

export default function Orders() {
  const { store } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else {
      setError("");
      setOrders(data || []);
    }
    setLoading(false);
  }, [store.id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    const previous = orders;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error: updateError } = await supabase.from("orders").update({ status }).eq("id", id);
    if (updateError) {
      setOrders(previous);
      setError("Impossible de mettre à jour la commande : " + updateError.message);
    } else {
      setError("");
    }
  }

  // Merge fields returned by the ABM function (tracking number, status...) into one order
  function patchOrder(id, patch) {
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  async function copyDetails(o) {
    const text = `${o.customer_name}\n${o.phone}\n${o.address}, ${o.city}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(o.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* clipboard not available */
    }
  }

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    return {
      total: orders.length,
      fresh: orders.filter((o) => o.status === "new").length,
      toDeliver: orders.filter((o) => o.status === "confirmed" || o.status === "shipped").length,
      revenue: active.reduce((sum, o) => sum + Number(o.total || 0), 0),
    };
  }, [orders]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUSES.forEach(([v]) => { c[v] = orders.filter((o) => o.status === v).length; });
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return [o.customer_name, o.phone, o.city, o.address, shortId(o.id)]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [orders, filter, query]);

  // Group the (already newest-first) orders by day
  const groups = useMemo(() => {
    const result = [];
    visible.forEach((o) => {
      const label = dayLabel(o.created_at);
      const last = result[result.length - 1];
      if (last && last.label === label) last.orders.push(o);
      else result.push({ label, orders: [o] });
    });
    return result;
  }, [visible]);

  return (
    <>
      <div className="page-head ord-head">
        <h1>Commandes</h1>
        <button type="button" className="ord-refresh" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "ord-spin" : ""} /> Actualiser
        </button>
      </div>

      <div className="ord-stats">
        <div className="ord-stat">
          <span>Toutes les commandes</span>
          <strong>{stats.total}</strong>
        </div>
        <div className={`ord-stat ${stats.fresh ? "ord-stat-alert" : ""}`}>
          <span>Nouvelles, à traiter</span>
          <strong>{stats.fresh}</strong>
        </div>
        <div className="ord-stat">
          <span>En route</span>
          <strong>{stats.toDeliver}</strong>
        </div>
        <div className="ord-stat">
          <span>Chiffre d'affaires (hors annulées)</span>
          <strong>{formatPrice(stats.revenue)}</strong>
        </div>
      </div>

      <div className="ord-toolbar">
        <div className="ord-filters" role="tablist" aria-label="Filtrer les commandes par statut">
          {[["all", "Toutes"], ...STATUSES].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={`ord-pill ${filter === value ? "is-active" : ""}`}
              onClick={() => setFilter(value)}
            >
              {label} <span>{counts[value] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="ord-search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom, un téléphone, une ville ou un n° de commande"
          />
        </label>
      </div>

      {error && <p className="msg msg-error" role="alert">{error}</p>}

      {loading && orders.length === 0 ? (
        <p>Chargement...</p>
      ) : orders.length === 0 ? (
        <div className="empty"><p>Aucune commande pour le moment. Quand un client passe commande, elle apparaît ici.</p></div>
      ) : visible.length === 0 ? (
        <div className="empty"><p>Aucune commande ne correspond à ce filtre.</p></div>
      ) : (
        groups.map((group) => (
          <section className="ord-group" key={group.label}>
            <h2>{group.label} <span>{group.orders.length}</span></h2>

            {group.orders.map((o) => {
              const open = openId === o.id;
              const next = NEXT[o.status];
              const items = o.order_items || [];
              const itemCount = countItems(o);

              return (
                <article className={`ord ord-${o.status} ${open ? "is-open" : ""}`} key={o.id}>
                  <button
                    type="button"
                    className="ord-row"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : o.id)}
                  >
                    <span className="ord-id">#{shortId(o.id)}<small>{timeLabel(o.created_at)}</small></span>
                    <span className="ord-customer"><strong>{o.customer_name}</strong><small>{o.city}</small></span>
                    <span className="ord-count">{itemCount} {itemCount > 1 ? "articles" : "article"}</span>
                    <span className={`ord-badge ord-badge-${o.status}`}>{LABEL[o.status] || o.status}</span>
                    <strong className="ord-total">{formatPrice(o.total)}</strong>
                    <ChevronDown size={18} className="ord-chevron" />
                  </button>

                  {open && (
                    <div className="ord-detail">
                      <div className="ord-cols">
                        <div>
                          <h3>Client</h3>
                          <p><strong>{o.customer_name}</strong></p>
                          <p><a href={`tel:${o.phone}`}>{o.phone}</a></p>
                          <p>{o.address}, {o.city}</p>
                          {o.note && <p className="ord-note">« {o.note} »</p>}
                        </div>

                        <div>
                          <h3>Articles</h3>
                          <ul className="ord-items">
                            {items.map((i) => (
                              <li key={i.id}>
                                <span>{i.quantity} × {i.name}</span>
                                <span>{formatPrice(i.price * i.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="ord-sum">
                            <span>Paiement à la livraison</span>
                            <strong>{formatPrice(o.total)}</strong>
                          </div>
                        </div>
                      </div>

                      <AbmShipping order={o} store={store} onPatch={patchOrder} />

                      <div className="ord-actions">
                        {next && (
                          <button type="button" className="ord-primary" onClick={() => setStatus(o.id, next[0])}>
                            {next[1]}
                          </button>
                        )}
                        <a className="ord-btn" href={`tel:${o.phone}`}><Phone size={14} /> Appeler</a>
                        <a
                          className="ord-btn"
                          href={whatsappLink(o.phone, `Bonjour ${o.customer_name}, ici ${store.name} au sujet de votre commande #${shortId(o.id)}.`)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                        <button type="button" className="ord-btn" onClick={() => copyDetails(o)}>
                          {copiedId === o.id ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier l'adresse</>}
                        </button>
                        <label className="ord-select">
                          Statut
                          <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))
      )}
    </>
  );
}
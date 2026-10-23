import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../lib/utils.js";
import LineChart from "../../components/LineChart.jsx";

const PERIODS = [[7, "7 jours"], [30, "30 jours"], [90, "90 jours"]];
const STATUS_LABELS = { new: "Nouvelle", confirmed: "Confirmée", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée" };
const STATUS_COLORS = { new: "var(--saffron)", confirmed: "var(--teal)", shipped: "#3B7C8C", delivered: "var(--ok)", cancelled: "var(--clay)" };

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function change(cur, prev) {
  if (prev === 0) return cur === 0 ? null : { text: "Nouveau", dir: "up" };
  const p = ((cur - prev) / prev) * 100;
  if (Math.abs(p) < 0.5) return { text: "Stable", dir: "flat" };
  return { text: `${p > 0 ? "+" : ""}${p.toFixed(0)}%`, dir: p > 0 ? "up" : "down" };
}

function Kpi({ label, value, delta, hint }) {
  return (
    <div className="kpi">
      <small>{label}</small>
      <strong>{value}</strong>
      {delta ? <span className={`delta ${delta.dir}`}>{delta.text} <em>vs période précédente</em></span>
             : <span className="delta flat">{hint || "\u00A0"}</span>}
    </div>
  );
}

function Bars({ rows, empty }) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="bar-top"><span>{r.label}</span><strong>{r.right}</strong></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function Stats() {
  const { store } = useOutletContext();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("revenue");
  const [orders, setOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (days * 2 - 1)); // current + previous period
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total, status, city, order_items(name, quantity, price)")
        .eq("store_id", store.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
        .limit(5000);
      if (cancelled) return;
      if (error) setError(error.message);
      setOrders(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [store.id, days]);

  useEffect(() => {
    supabase.from("products").select("id, name, stock").eq("store_id", store.id)
      .lte("stock", 5).order("stock", { ascending: true }).limit(8)
      .then(({ data }) => setLowStock(data || []));
  }, [store.id]);

  const s = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startCur = new Date(today);
    startCur.setDate(today.getDate() - (days - 1));
    const startPrev = new Date(startCur);
    startPrev.setDate(startCur.getDate() - days);

    const cur = [], prev = [];
    for (const o of orders) {
      const t = new Date(o.created_at);
      if (t >= startCur) cur.push(o);
      else if (t >= startPrev) prev.push(o);
    }
    const valid = (list) => list.filter((o) => o.status !== "cancelled");
    const sum = (list) => list.reduce((n, o) => n + Number(o.total), 0);
    const curValid = valid(cur), prevValid = valid(prev);
    const revenue = sum(curValid), prevRevenue = sum(prevValid);
    const avg = curValid.length ? revenue / curValid.length : 0;
    const prevAvg = prevValid.length ? prevRevenue / prevValid.length : 0;

    const buckets = new Map();
    for (let i = 0; i < days; i++) {
      const d = new Date(startCur);
      d.setDate(startCur.getDate() + i);
      buckets.set(dayKey(d), { date: d, revenue: 0, orders: 0 });
    }
    for (const o of curValid) {
      const b = buckets.get(dayKey(new Date(o.created_at)));
      if (b) { b.revenue += Number(o.total); b.orders += 1; }
    }
    const series = [...buckets.values()];
    const best = series.reduce((a, b) => (b.revenue > a.revenue ? b : a), series[0]);

    const prod = new Map();
    let units = 0;
    for (const o of curValid) {
      for (const i of o.order_items || []) {
        const p = prod.get(i.name) || { name: i.name, qty: 0, revenue: 0 };
        p.qty += i.quantity;
        p.revenue += i.quantity * Number(i.price);
        units += i.quantity;
        prod.set(i.name, p);
      }
    }
    const topProducts = [...prod.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const status = {};
    for (const o of cur) status[o.status] = (status[o.status] || 0) + 1;

    const cityMap = new Map();
    for (const o of curValid) {
      const name = (o.city || "").trim() || "Inconnue";
      const key = name.toLowerCase();
      const e = cityMap.get(key) || { name, count: 0, revenue: 0 };
      e.count += 1;
      e.revenue += Number(o.total);
      cityMap.set(key, e);
    }
    const topCities = [...cityMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      revenue, prevRevenue, avg, prevAvg, units, series, best, topProducts, status, topCities,
      count: curValid.length, prevCount: prevValid.length, total: cur.length,
    };
  }, [orders, days]);

  const chartData = s.series.map((d) => ({
    label: d.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    value: metric === "revenue" ? d.revenue : d.orders,
  }));
  const fmt = metric === "revenue" ? formatPrice : (v) => `${v} commande${v > 1 ? "s" : ""}`;

  const statusRows = Object.keys(STATUS_LABELS)
    .filter((k) => s.status[k])
    .map((k) => ({ key: k, label: STATUS_LABELS[k], value: s.status[k], right: s.status[k], color: STATUS_COLORS[k] }));

  const cancelledCount = s.total - s.count;

  return (
    <>
      <div className="page-head">
        <h1>Statistiques</h1>
        <div className="seg" role="group" aria-label="Période">
          {PERIODS.map(([d, l]) => (
            <button key={d} className={d === days ? "on" : ""} onClick={() => setDays(d)}>{l}</button>
          ))}
        </div>
      </div>

      {error && <p className="msg msg-error" role="alert">{error}</p>}

      <div className="kpis">
        <Kpi label="Chiffre d'affaires" value={formatPrice(s.revenue)} delta={change(s.revenue, s.prevRevenue)} />
        <Kpi label="Commandes" value={s.count} delta={change(s.count, s.prevCount)} hint={cancelledCount > 0 ? `${cancelledCount} annulée${cancelledCount > 1 ? "s" : ""}` : ""} />
        <Kpi label="Panier moyen" value={formatPrice(s.avg)} delta={change(s.avg, s.prevAvg)} />
        <Kpi label="Articles vendus" value={s.units} hint={s.status.new ? `${s.status.new} nouvelle${s.status.new > 1 ? "s" : ""} à confirmer` : ""} />
      </div>

      <section className="panel">
        <div className="card-head">
          <h2>{metric === "revenue" ? "Chiffre d'affaires par jour" : "Commandes par jour"}</h2>
          <div className="seg" role="group" aria-label="Indicateur du graphique">
            <button className={metric === "revenue" ? "on" : ""} onClick={() => setMetric("revenue")}>Chiffre d'affaires</button>
            <button className={metric === "orders" ? "on" : ""} onClick={() => setMetric("orders")}>Commandes</button>
          </div>
        </div>
        {loading ? <p className="muted">Chargement...</p> : (
          <>
            <LineChart
              data={chartData}
              format={fmt}
              label={metric === "revenue" ? `Chiffre d'affaires par jour, ${days} derniers jours` : `Commandes par jour, ${days} derniers jours`}
            />
            {s.count === 0 ? (
              <p className="muted">Aucune commande sur cette période pour le moment. Elles apparaîtront ici dès que vos clients commanderont.</p>
            ) : (
              <p className="muted">
                Meilleur jour : {s.best.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} avec {formatPrice(s.best.revenue)}. Les commandes annulées ne sont pas comptées.
              </p>
            )}
          </>
        )}
      </section>

      <div className="stat-grid">
        <section className="panel">
          <h2>Produits les plus vendus</h2>
          <Bars empty="Aucune vente sur cette période."
            rows={s.topProducts.map((p) => ({ key: p.name, label: p.name, value: p.revenue, right: `${formatPrice(p.revenue)} (${p.qty} vendu${p.qty > 1 ? "s" : ""})` }))} />
        </section>

        <section className="panel">
          <h2>Commandes par statut</h2>
          <Bars empty="Aucune commande sur cette période." rows={statusRows} />
        </section>

        <section className="panel">
          <h2>Villes principales</h2>
          <Bars empty="Aucune commande sur cette période."
            rows={s.topCities.map((c) => ({ key: c.name, label: c.name, value: c.count, right: `${c.count} commande${c.count > 1 ? "s" : ""}` }))} />
        </section>

        <section className="panel">
          <h2>Stock faible</h2>
          {lowStock.length === 0 ? <p className="muted">Tous les produits ont plus de 5 articles en stock.</p> : (
            <ul className="stock-list">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <strong className={p.stock === 0 ? "danger" : ""}>{p.stock === 0 ? "Épuisé" : `${p.stock} restant${p.stock > 1 ? "s" : ""}`}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
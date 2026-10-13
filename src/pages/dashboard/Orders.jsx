import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../lib/utils.js";

const STATUSES = [
  ["new", "New"],
  ["confirmed", "Confirmed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

export default function Orders() {
  const { store } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, [store.id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  return (
    <>
      <div className="page-head"><h1>Orders</h1></div>
      {loading ? <p>Loading...</p> : orders.length === 0 ? (
        <div className="empty"><p>No orders yet. When a customer checks out, the order shows up here.</p></div>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <header>
                <div>
                  <strong>{o.customer_name}</strong>
                  <div className="muted">{new Date(o.created_at).toLocaleString("fr-TN")}</div>
                </div>
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className={`status status-${o.status}`}>
                  {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </header>
              <p><a href={`tel:${o.phone}`}>{o.phone}</a><br />{o.address}, {o.city}</p>
              {o.note && <p className="muted">Note: {o.note}</p>}
              <ul>
                {o.order_items.map((i) => (
                  <li key={i.id}><span>{i.quantity} x {i.name}</span><span>{formatPrice(i.price * i.quantity)}</span></li>
                ))}
              </ul>
              <footer><span>Pay on delivery</span><strong>{formatPrice(o.total)}</strong></footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

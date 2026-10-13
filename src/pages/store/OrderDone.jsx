import { Link, useOutletContext } from "react-router-dom";

export default function OrderDone() {
  const { store, base } = useOutletContext();
  return (
    <div className="s-empty">
      <h1>Order placed</h1>
      <p>Thank you! {store.name} will call you soon to confirm delivery.</p>
      {store.phone && <p className="muted">Questions? Call {store.phone}.</p>}
      <Link className="s-btn" to={base}>Keep shopping</Link>
    </div>
  );
}

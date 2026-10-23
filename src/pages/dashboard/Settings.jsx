import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import DodgeField from "../../components/react-bits/DodgeField.jsx";

export default function Settings() {
  const { user, store, setStore } = useOutletContext();
  const navigate = useNavigate();

  // delete store only
  const [storeText, setStoreText] = useState("");
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeError, setStoreError] = useState("");

  // delete whole account
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteStore() {
    setStoreError("");
    setStoreBusy(true);

    // .select() returns the deleted rows, so we can tell if anything was really deleted
    const { data, error: deleteError } = await supabase
      .from("stores")
      .delete()
      .eq("id", store.id)
      .eq("owner_id", user.id)
      .select();

    setStoreBusy(false);

    if (deleteError) {
      const blocked = deleteError.code === "23503"; // foreign key: products/orders still linked
      return setStoreError(
        blocked
          ? "The store still has linked data that couldn't be removed automatically. See the note below the button."
          : "Could not delete the store. " + deleteError.message
      );
    }
    if (!data || data.length === 0) {
      return setStoreError("Nothing was deleted. The database doesn't allow store owners to delete their store yet (missing delete policy).");
    }

    // The dashboard goes back to the "Name your store" screen
    setStore(null);
    navigate("/dashboard", { replace: true });
  }

  async function deleteAccount() {
    setError("");
    setBusy(true);
    const { error: fnError } = await supabase.functions.invoke("delete-account");
    if (fnError) {
      setBusy(false);
      return setError("Could not delete the account. Please try again. (" + fnError.message + ")");
    }
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/";
  }

  const storeConfirmed = storeText.trim() === store.name.trim();

  return (
    <>
      <div className="page-head"><h1>Settings</h1></div>

      <section className="panel">
        <h2>Account</h2>
        <p className="muted">Logged in as <strong>{user.email}</strong></p>
      </section>

      <section className="panel">
        <h2>Livraison (ABM Delivery)</h2>
        <p className="muted">
          Votre adresse d'enlèvement et vos colis sont gérés dans la page <Link to="/dashboard/delivery">Livraison</Link>.
        </p>
      </section>

      <section className="panel danger-zone">
        <h2>Delete store only</h2>
        <p>
          This permanently deletes your store <strong>{store.name}</strong> with all its products,
          offers and orders. Your store link <code>/store/{store.slug}</code> stops working
          immediately. <strong>Your account stays</strong>, so you can create a new store afterwards.
          This cannot be undone.
        </p>
        <label>Type the store name <code>{store.name}</code> to confirm
          <input
            value={storeText}
            onChange={(e) => setStoreText(e.target.value)}
            placeholder={store.name}
            autoComplete="off"
          />
        </label>
        {storeError && <p className="msg msg-error" role="alert">{storeError}</p>}
        <button className="btn btn-danger" onClick={deleteStore} disabled={!storeConfirmed || storeBusy}>
          {storeBusy ? "Deleting store..." : "Delete my store"}
        </button>
      </section>

      <section className="panel danger-zone">
        <h2>Delete account</h2>
        <p>
          This permanently deletes your account, your store <strong>{store.name}</strong>, all
          products, offers, orders and uploaded images. Your store link stops working immediately.
          <strong> This cannot be undone.</strong>
        </p>
        <label>Type <code>DELETE</code> to confirm
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" autoComplete="off" />
        </label>
        {error && <p className="msg msg-error" role="alert">{error}</p>}
        {text === "DELETE" && !busy && (
          <p className="muted">
            Heads up: this button dodges your mouse for a few tries. Keyboard (Tab, then Enter) and touch work normally.
          </p>
        )}
        <DodgeField active={text === "DELETE" && !busy}>
          <button className="btn btn-danger" onClick={deleteAccount} disabled={text !== "DELETE" || busy}>
            {busy ? "Deleting..." : "Delete my account permanently"}
          </button>
        </DodgeField>
      </section>
    </>
  );
}
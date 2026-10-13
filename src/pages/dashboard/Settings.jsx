import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";

export default function Settings() {
  const { user, store } = useOutletContext();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    setError("");
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      setBusy(false);
      return setError("Could not delete the account. Please try again. (" + error.message + ")");
    }
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/";
  }

  return (
    <>
      <div className="page-head"><h1>Settings</h1></div>

      <section className="panel">
        <h2>Account</h2>
        <p className="muted">Logged in as <strong>{user.email}</strong></p>
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
        <button className="btn btn-danger" onClick={deleteAccount} disabled={text !== "DELETE" || busy}>
          {busy ? "Deleting..." : "Delete my account permanently"}
        </button>
      </section>
    </>
  );
}

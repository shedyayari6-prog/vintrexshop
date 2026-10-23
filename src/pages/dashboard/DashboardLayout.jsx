import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { BarChart3, Package, ClipboardList, Truck, Palette, Settings, ExternalLink, LogOut } from "lucide-react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { slugify } from "../../lib/utils.js";
import Brand from "../../components/Brand.jsx";

function CreateStore({ user, onCreated }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function onName(v) {
    setName(v);
    if (!touched) setSlug(slugify(v));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const clean = slugify(slug);
    if (!name.trim() || !clean) return setError("Enter a store name and a link.");
    setBusy(true);
    const { data, error } = await supabase
      .from("stores")
      .insert({ owner_id: user.id, name: name.trim(), slug: clean })
      .select()
      .single();
    setBusy(false);
    if (error) {
      return setError(error.code === "23505" ? "That link is taken. Try another one." : error.message);
    }
    onCreated(data);
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Name your store</h1>
        <label>Store name
          <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Urban Wear" required />
        </label>
        <label>Store link
          <div className="slug-input">
            <span>/store/</span>
            <input value={slug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} placeholder="urban-wear" />
          </div>
        </label>
        {error && <p className="msg msg-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Creating..." : "Create store"}</button>
      </form>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const [store, setStore] = useState(null);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("stores").select("*").eq("owner_id", user.id).maybeSingle();
    setStore(data);
    setFetching(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading || (user && fetching)) return <div className="center-note">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!store) return <CreateStore user={user} onCreated={setStore} />;

  return (
    <div className="dash">
      <aside className="dash-side">
        <Brand />
        <p className="dash-store">{store.name}</p>
        <nav>
          <NavLink to="stats"><BarChart3 size={18} /> Statistics</NavLink>
          <NavLink to="products"><Package size={18} /> Products</NavLink>
          <NavLink to="orders"><ClipboardList size={18} /> Orders</NavLink>
          <NavLink to="delivery"><Truck size={18} /> Livraison</NavLink>
          <NavLink to="customize"><Palette size={18} /> Customize</NavLink>
          <NavLink to="settings"><Settings size={18} /> Settings</NavLink>
        </nav>
        <div className="dash-side-foot">
          <a href={`/store/${store.slug}`} target="_blank" rel="noreferrer" className="side-link">
            <ExternalLink size={16} /> View store
          </a>
          <button className="side-link" onClick={signOut}><LogOut size={16} /> Log out</button>
        </div>
      </aside>
      <main className="dash-main">
        <Outlet context={{ store, setStore, user }} />
      </main>
    </div>
  );
}
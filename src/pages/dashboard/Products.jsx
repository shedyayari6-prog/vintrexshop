import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { formatPrice } from "../../lib/utils.js";
import ImageField from "../../components/ImageField.jsx";
import ShareButton from "../../components/ShareButton.jsx";
import VariantsField, { cleanOptions } from "../../components/VariantsField.jsx";

const EMPTY = { name: "", description: "", price: "", category: "", stock: 0, available: true, image_url: null, options: [] };

function ProductForm({ initial, storeId, userId, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setError("");
    const price = parseFloat(form.price);
    if (!form.name.trim()) return setError("Saisissez un nom de produit.");
    if (Number.isNaN(price) || price < 0) return setError("Saisissez un prix valide.");
    setBusy(true);
    const row = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      category: form.category.trim(),
      stock: Math.max(0, parseInt(form.stock, 10) || 0),
      available: form.available,
      image_url: form.image_url,
      options: cleanOptions(form.options),
    };
    const { error } = form.id
      ? await supabase.from("products").update(row).eq("id", form.id)
      : await supabase.from("products").insert({ ...row, store_id: storeId });
    setBusy(false);
    if (error) {
      const hint = /options/i.test(error.message) ? " Exécutez d'abord dans Supabase la ligne SQL qui ajoute la colonne options." : "";
      return setError(error.message + hint);
    }
    onSaved();
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2>{form.id ? "Modifier le produit" : "Ajouter un produit"}</h2>
        <ImageField label="Photo" shape="square" value={form.image_url} onChange={(v) => set("image_url", v)} userId={userId} />
        <label>Nom<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
        <div className="row-2">
          <label>Prix (DT)<input type="number" step="0.001" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} required /></label>
          <label>En stock<input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></label>
        </div>
        <label>Catégorie<input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="T-shirts" /></label>
        <label>Description<textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
        <VariantsField value={form.options || []} onChange={(v) => set("options", v)} />
        <label className="check"><input type="checkbox" checked={form.available} onChange={(e) => set("available", e.target.checked)} /> Afficher dans la boutique</label>
        {error && <p className="msg msg-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Enregistrement..." : "Enregistrer le produit"}</button>
        </div>
      </form>
    </div>
  );
}

export default function Products() {
  const { store, user } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  }, [store.id]);

  useEffect(() => { load(); }, [load]);

  async function remove(p) {
    if (!window.confirm(`Supprimer « ${p.name} » ? Cette action est irréversible.`)) return;
    await supabase.from("products").delete().eq("id", p.id);
    load();
  }

  // Links that take customers straight to the store / a specific product
  const storeUrl = `${window.location.origin}/store/${store.slug}`;
  const productUrl = (p) => `${storeUrl}/product/${p.id}`;

  return (
    <>
      <div className="page-head">
        <h1>Produits</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ShareButton label="Partager la boutique" url={storeUrl} title={store.name} text={`Découvrez ${store.name}`} />
          <button className="btn btn-primary" onClick={() => setEditing(EMPTY)}><Plus size={16} /> Ajouter un produit</button>
        </div>
      </div>

      {loading ? <p>Chargement...</p> : products.length === 0 ? (
        <div className="empty">
          <p>Aucun produit pour le moment. Ajoutez le premier et il apparaîtra dans votre boutique.</p>
          <button className="btn btn-primary" onClick={() => setEditing(EMPTY)}>Ajouter un produit</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th></th><th>Nom</th><th>Prix</th><th>Stock</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="thumb-cell">{p.image_url ? <img src={p.image_url} alt="" /> : <div className="thumb-empty" />}</td>
                  <td><strong>{p.name}</strong><div className="muted">{p.category}</div></td>
                  <td>{formatPrice(p.price)}</td>
                  <td className={p.stock === 0 ? "danger" : ""}>{p.stock === 0 ? "Épuisé" : p.stock}</td>
                  <td>{p.available ? "Visible" : "Masqué"}</td>
                  <td className="actions">
                    {/* Hidden products can't be opened by customers, so no share link for them */}
                    {p.available && (
                      <ShareButton
                        variant="icon"
                        className="share-flat"
                        label={`Partager ${p.name}`}
                        url={productUrl(p)}
                        title={p.name}
                        text={`${p.name} - ${formatPrice(p.price)} | ${store.name}`}
                      />
                    )}
                    <button className="icon-btn" onClick={() => setEditing({ ...p, price: String(p.price), options: p.options || [] })} aria-label={`Modifier ${p.name}`}><Pencil size={16} /></button>
                    <button className="icon-btn" onClick={() => remove(p)} aria-label={`Supprimer ${p.name}`}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm initial={editing} storeId={store.id} userId={user.id}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </>
  );
}
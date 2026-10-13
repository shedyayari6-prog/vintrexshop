import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadImage } from "../lib/utils.js";

export default function ImageField({ label, value, onChange, userId, shape = "wide" }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return setError("Image is over 3 MB. Choose a smaller one.");
    setError("");
    setBusy(true);
    try {
      onChange(await uploadImage(file, userId));
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className={`image-field ${shape}`}>
        {value ? (
          <>
            <img src={value} alt="" />
            <button type="button" className="image-clear" onClick={() => onChange(null)} aria-label="Remove image">
              <X size={14} />
            </button>
          </>
        ) : (
          <button type="button" className="image-empty" onClick={() => input.current.click()} disabled={busy}>
            <ImagePlus size={20} />
            <span>{busy ? "Uploading..." : "Add image"}</span>
          </button>
        )}
      </div>
      {value && (
        <button type="button" className="link-btn" onClick={() => input.current.click()} disabled={busy}>
          {busy ? "Uploading..." : "Replace"}
        </button>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
      {error && <p className="msg msg-error">{error}</p>}
    </div>
  );
}

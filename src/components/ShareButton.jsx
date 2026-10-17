import { useEffect, useRef, useState } from "react";
import { Check, Facebook, Link2, Mail, MessageCircle, Send, Share2 } from "lucide-react";

// Copy to clipboard, with a fallback for browsers that block the modern API
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Share button.
 *  - Phones: opens the native share sheet (WhatsApp, Messenger, Instagram...)
 *  - Desktop: opens a small menu (copy link, WhatsApp, Facebook, Telegram, X, email)
 *
 * Props:
 *  url      link to share (defaults to the current page address)
 *  title    short title, e.g. the product name
 *  text     message shown with the link (defaults to the title)
 *  label    button text (default "Share")
 *  variant  "button" (icon + text) or "icon" (round icon only, for product cards)
 */
export default function ShareButton({ url, title = "", text = "", label = "Share", variant = "button", className = "" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);

  const link = url || (typeof window !== "undefined" ? window.location.href : "");
  const message = text || title;

  // Close the menu on outside click or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onTriggerClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
    if (isTouch && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: message, url: link });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // user closed the share sheet
        // anything else: fall through to the menu
      }
    }
    setOpen((o) => !o);
  }

  async function onCopy() {
    const ok = await copyText(link);
    if (ok) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    }
  }

  const full = encodeURIComponent(`${message} ${link}`.trim());
  const u = encodeURIComponent(link);
  const m = encodeURIComponent(message);

  const targets = [
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${full}` },
    { key: "facebook", label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: "telegram", label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${u}&text=${m}` },
    { key: "x", label: "X (Twitter)", icon: Share2, href: `https://twitter.com/intent/tweet?text=${m}&url=${u}` },
    { key: "email", label: "Email", icon: Mail, href: `mailto:?subject=${encodeURIComponent(title || message)}&body=${full}` },
  ];

  const iconOnly = variant === "icon";

  return (
    <div className={`share ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`share-trigger ${iconOnly ? "share-icon" : ""}`}
        onClick={onTriggerClick}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={iconOnly ? label : undefined}
        title={label}
      >
        <Share2 size={iconOnly ? 17 : 16} />
        {!iconOnly && <span>{label}</span>}
      </button>

      {open && (
        <div className="share-menu" role="menu" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="share-item" role="menuitem" onClick={onCopy}>
            {copied ? <Check size={17} /> : <Link2 size={17} />}
            {copied ? "Link copied" : "Copy link"}
          </button>

          {targets.map(({ key, label: itemLabel, icon: Icon, href }) => (
            <a
              key={key}
              className="share-item"
              role="menuitem"
              href={href}
              target={key === "email" ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <Icon size={17} /> {itemLabel}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

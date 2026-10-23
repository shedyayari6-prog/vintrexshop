import { LANGS, useLang } from "../lib/i18n.js";
import "../pages/delivery.css";

// Small FR / ع / EN switcher. The choice is remembered in the browser.
export default function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="dl-lang" role="group" aria-label="Language">
      {LANGS.map(([code, short, name]) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={name}
          aria-pressed={lang === code}
          className={`dl-lang-btn ${lang === code ? "is-active" : ""}`}
          onClick={() => setLang(code)}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

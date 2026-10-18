import { useEffect } from "react";

const SITE = "https://www.vintrexshop.store";

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Sets the title, description and canonical address for the page that is open.
//   useSeo({ title: "...", description: "...", path: "/privacy" });
// Every page should use its own values, so Google does not see all pages as one.
export function useSeo({ title, description, path }) {
  useEffect(() => {
    if (title) {
      document.title = title;
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }
    if (path !== undefined) {
      const url = SITE + path;
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = url;
      setMeta("property", "og:url", url);
    }
  }, [title, description, path]);
}

import { useEffect, useRef } from "react";

/**
 * Loads a plain Adsterra script (Native Banner, Social Bar, etc.).
 *
 * Native Banner (needs its container div, id = "container-<key>"):
 *   <AdsterraScript
 *     src="https://bauval.org/21/348a4659af3ab27061753a733e4b4f10"
 *     containerId="container-348a4659af3ab27061753a733e4b4f10"
 *   />
 *
 * Social Bar (no container):
 *   <AdsterraScript src="https://EXACT-URL-FROM-ADSTERRA" />
 */
export default function AdsterraScript({ src, containerId, minHeight }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!src) return undefined;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    document.body.appendChild(script);

    const box = boxRef.current;
    return () => {
      script.remove();
      if (box) box.replaceChildren();
    };
  }, [src]);

  if (!containerId) return null;
  return <div ref={boxRef} id={containerId} style={{ width: "100%", minHeight }} />;
}

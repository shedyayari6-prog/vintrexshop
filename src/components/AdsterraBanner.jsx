import { useMemo } from "react";

/**
 * Usage (copy adKey and scriptUrl exactly from Adsterra's "Get Code" popup):
 *
 * <AdsterraBanner
 *   adKey="YOUR_KEY"
 *   scriptUrl="https://EXACT-DOMAIN-FROM-ADSTERRA/YOUR_KEY/invoke.js"
 *   width={468}
 *   height={60}
 * />
 *
 * width/height must match the size of the ad unit you created.
 */
export default function AdsterraBanner({
  adKey,
  scriptUrl,
  width = 468,
  height = 60,
}) {
  const srcDoc = useMemo(() => {
    if (!adKey || !scriptUrl) return "";
    return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;display:flex;justify-content:center;align-items:center;">
    <script>
      atOptions = {
        key: ${JSON.stringify(adKey)},
        format: "iframe",
        height: ${Number(height)},
        width: ${Number(width)},
        params: {}
      };
    <\/script>
    <script src=${JSON.stringify(scriptUrl)}><\/script>
  </body>
</html>`;
  }, [adKey, scriptUrl, width, height]);

  if (!srcDoc) return null;

  return (
    <iframe
      title="Advertisement"
      srcDoc={srcDoc}
      width={width}
      height={height}
      scrolling="no"
      frameBorder="0"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      style={{
        border: 0,
        display: "block",
        margin: "0 auto",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    />
  );
}
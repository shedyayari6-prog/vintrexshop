import { WATERMARK_TEXT } from "../lib/config.js";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="170">
<text x="140" y="85" text-anchor="middle" dominant-baseline="middle"
 font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="28" letter-spacing="4"
 fill="#808080" transform="rotate(-24 140 85)">${WATERMARK_TEXT}</text></svg>`;

const url = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;

// Sits on top of the whole page, never blocks clicks.
export default function Watermark() {
  return <div className="watermark" aria-hidden="true" style={{ backgroundImage: url }} />;
}

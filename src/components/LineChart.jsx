import { useRef, useState } from "react";

const W = 680, H = 280, PL = 56, PR = 16, PT = 16, PB = 30;

function niceMax(v) {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

// Smooth curve through the points (never dips below the baseline).
function smoothPath(pts, baseY) {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = Math.min(p1.y + (p2.y - p0.y) / 6, baseY);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = Math.min(p2.y - (p3.y - p1.y) / 6, baseY);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const axisNumber = new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 });

// data: [{ label: "12 Oct", value: 42 }, ...]
export default function LineChart({ data, format = (v) => String(v), label = "Chart" }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);

  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const iw = W - PL - PR;
  const ih = H - PT - PB;
  const baseY = PT + ih;
  const pts = data.map((d, i) => ({
    x: PL + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw),
    y: baseY - (d.value / max) * ih,
  }));

  const line = pts.length > 1 ? smoothPath(pts, baseY) : "";
  const area = line ? `${line} L${pts[pts.length - 1].x},${baseY} L${pts[0].x},${baseY} Z` : "";
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const xLabels = pts.length > 1
    ? [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (data.length - 1)))
    : [0];

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - PL) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  }

  const h = hover !== null ? pts[hover] : null;

  return (
    <div className="chart-wrap">
      <svg ref={ref} className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--teal)", stopOpacity: 0.28 }} />
            <stop offset="100%" style={{ stopColor: "var(--teal)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = baseY - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="#E3DFD6" strokeWidth="1" />
              <text x={PL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6B7480">{axisNumber.format(t)}</text>
            </g>
          );
        })}

        {xLabels.map((i) => (
          <text key={i} x={pts[i].x} y={H - 8} fontSize="11" fill="#6B7480"
            textAnchor={i === 0 && pts.length > 1 ? "start" : i === data.length - 1 && pts.length > 1 ? "end" : "middle"}>
            {data[i].label}
          </text>
        ))}

        {area && <path d={area} fill="url(#chartFill)" />}
        {line && <path d={line} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

        {h && (
          <g>
            <line x1={h.x} x2={h.x} y1={PT} y2={baseY} stroke="#6B7480" strokeDasharray="4 4" strokeWidth="1" />
            <circle cx={h.x} cy={h.y} r="5" fill="#fff" stroke="var(--teal)" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {h && (
        <div className="chart-tip" style={{ left: `${Math.min(88, Math.max(12, (h.x / W) * 100))}%` }}>
          <strong>{format(data[hover].value)}</strong> &nbsp;{data[hover].label}
        </div>
      )}
    </div>
  );
}

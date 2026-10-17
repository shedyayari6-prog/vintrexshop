import { useEffect, useRef } from "react";
import "./DodgeField.css";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Wrap anything in <DodgeField> and it slides away from the mouse pointer.
 * After `relentAfter` escapes it gives up, glides back home and can be clicked.
 *
 * Mouse and pen only: touch, keyboard focus and "reduce motion" never dodge,
 * so the wrapped control always stays reachable.
 *
 * Props
 *  active       dodge only while true (e.g. once a confirmation is typed)
 *  radius       distance (px) from the element's edge where it starts fleeing
 *  maxShift     furthest it may travel from home (px)
 *  relentAfter  number of escapes before it gives up
 *  margin       min distance kept from the window edges (px)
 *  onRelent     called once when it gives up
 */
export default function DodgeField({
  children,
  active = true,
  radius = 110,
  maxShift = 240,
  relentAfter = 6,
  margin = 12,
  onRelent,
  className = "",
}) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const optsRef = useRef({});
  optsRef.current = { radius, maxShift, relentAfter, margin, onRelent };
  const state = useRef({
    x: 0, y: 0, tx: 0, ty: 0, raf: 0, last: 0,
    homing: true, inside: false, count: 0, relented: false, focused: false, pointer: null,
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return undefined;
    const st = state.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // a fresh start every time `active` changes
    st.count = 0;
    st.relented = false;
    st.inside = false;
    delete wrap.dataset.relented;

    const paint = () => {
      inner.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0)`;
      inner.classList.toggle("is-away", Math.abs(st.x) + Math.abs(st.y) > 1);
    };

    const tick = (now) => {
      st.raf = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - st.last) / 1000));
      st.last = now;
      const tau = st.homing ? 0.5 : 0.1; // quick when fleeing, slow when gliding home
      const k = 1 - Math.exp(-dt / tau);
      st.x += (st.tx - st.x) * k;
      st.y += (st.ty - st.y) * k;
      if (Math.hypot(st.tx - st.x, st.ty - st.y) < 0.2) {
        st.x = st.tx;
        st.y = st.ty;
        paint();
        return;
      }
      paint();
      st.raf = requestAnimationFrame(tick);
    };
    const run = () => {
      if (!st.raf) {
        st.last = performance.now();
        st.raf = requestAnimationFrame(tick);
      }
    };
    const goHome = () => {
      st.tx = 0;
      st.ty = 0;
      st.homing = true;
      run();
    };

    const evaluate = () => {
      const o = optsRef.current;
      const p = st.pointer;
      if (!active || reduce || st.relented || st.focused || !p) {
        st.inside = false;
        if (st.tx || st.ty) goHome();
        return;
      }
      const r = wrap.getBoundingClientRect(); // the wrapper never moves, so this is "home"
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const curX = cx + st.x;
      const curY = cy + st.y;
      const reach = o.radius + Math.max(r.width, r.height) / 2;

      if (Math.hypot(p.x - curX, p.y - curY) < reach) {
        if (!st.inside) {
          st.inside = true;
          st.count += 1;
          if (st.count >= o.relentAfter) {
            st.relented = true;
            wrap.dataset.relented = "true";
            goHome();
            o.onRelent?.();
            return;
          }
        }
        // put the element exactly `reach` away from the pointer, on the side it already is
        let ux = curX - p.x;
        let uy = curY - p.y;
        const len = Math.hypot(ux, uy);
        if (len < 1) {
          const a = Math.random() * Math.PI * 2;
          ux = Math.cos(a);
          uy = Math.sin(a);
        } else {
          ux /= len;
          uy /= len;
        }
        let dx = p.x + ux * reach - cx;
        let dy = p.y + uy * reach - cy;
        dx = clamp(dx, o.margin - r.left, window.innerWidth - o.margin - r.right);
        dy = clamp(dy, o.margin - r.top, window.innerHeight - o.margin - r.bottom);
        const m = Math.hypot(dx, dy);
        if (m > o.maxShift) {
          dx *= o.maxShift / m;
          dy *= o.maxShift / m;
        }
        st.tx = dx;
        st.ty = dy;
        st.homing = false;
        run();
      } else {
        st.inside = false;
        // pointer wandered far from home: glide back
        if ((st.tx || st.ty) && Math.hypot(p.x - cx, p.y - cy) > reach * 1.8) goHome();
      }
    };

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      st.pointer = { x: e.clientX, y: e.clientY };
      evaluate();
    };
    const onLeave = () => {
      st.pointer = null;
      evaluate();
    };
    const onFocusIn = (e) => {
      st.focused = Boolean(e.target.matches?.(":focus-visible"));
      evaluate();
    };
    const onFocusOut = () => {
      st.focused = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", evaluate, { passive: true });
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("focusin", onFocusIn);
    wrap.addEventListener("focusout", onFocusOut);
    evaluate();

    return () => {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", evaluate);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("focusin", onFocusIn);
      wrap.removeEventListener("focusout", onFocusOut);
    };
  }, [active]);

  return (
    <div ref={wrapRef} className={`dodge-field${className ? ` ${className}` : ""}`}>
      <div ref={innerRef} className="dodge-field__inner">{children}</div>
    </div>
  );
}

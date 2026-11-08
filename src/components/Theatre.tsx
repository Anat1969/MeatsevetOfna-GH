import { motion, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The runway hall as architecture: black box, a glossy floor that converges to a vanishing point,
 * curtain walls whose folds catch the collection's hidden colour, and a moving spot.
 * Depth is real data: t = 0 at the edge of the stage, t = 1 at the far wall.
 */
export function Theatre({ accent, children, className = '', dust = true }: { accent: string; children?: ReactNode; className?: string; dust?: boolean }) {
  return (
    <div className={`theatre ${className}`} style={{ ['--accent' as string]: accent }}>
      <div className="th-back" />
      <div className="th-floor"><div className="th-lane" /></div>
      <div className="th-curtain right" /><div className="th-curtain left" />
      <div className="th-spot" />
      {dust && <Dust />}
      <div className="th-stage">{children}</div>
    </div>
  );
}

const HORIZON = 0.42; // share of height from the top where the floor meets the back wall
export function place(t: number) {
  const k = Math.pow(t, 0.85);
  return { bottom: (1 - HORIZON) * k * 100 + 3, scale: 1 - 0.8 * k };
}

/** A figure standing on the floor at depth t, with its reflection on the gloss. */
export function Figure({ t, x = 0, children, onClick, label }: { t: MotionValue<number> | number; x?: number; children: ReactNode; onClick?: () => void; label?: string }) {
  const mv = useMotionValue(typeof t === 'number' ? t : t.get());
  useEffect(() => { if (typeof t === 'number') mv.set(t); else return t.on('change', (v) => mv.set(v)); }, [t, mv]);
  const bottom = useTransform(mv, (v) => `${place(v).bottom}%`);
  const scale = useTransform(mv, (v) => place(v).scale);
  const left = useTransform(mv, (v) => `calc(50% + ${x * (1 - 0.8 * Math.pow(v, 0.85))}%)`);
  const z = useTransform(mv, (v) => Math.round((1 - v) * 100));
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag className="figure" style={{ bottom, left, scale, zIndex: z }} onClick={onClick} aria-label={label}>
      <div className="fig-body">{children}</div>
      <div className="fig-mirror" aria-hidden="true">{children}</div>
    </Tag>
  );
}

/** Walk from the far wall to the edge of the stage. */
export function useWalk(key: unknown, from = 1, to = 0.02, seconds = 3.4) {
  const t = useMotionValue(from);
  useEffect(() => {
    t.set(from);
    const a = animate(t, to, { duration: seconds, ease: [0.25, 0.8, 0.3, 1] });
    return () => a.stop();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return t;
}

function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, v: Math.random() * 0.00025 + 0.00008, p: Math.random() * 6 }));
    const fit = () => { cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; };
    fit(); addEventListener('resize', fit);
    const tick = (now: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const d of P) {
        d.y -= d.v; if (d.y < 0) { d.y = 1; d.x = Math.random(); }
        const cx = 0.5 + (d.x - 0.5) * (0.35 + d.y * 0.4);
        const a = 0.35 + 0.35 * Math.sin(now / 900 + d.p);
        ctx.fillStyle = `rgba(255,244,225,${a * (1 - d.y) * 0.9})`;
        ctx.beginPath(); ctx.arc(cx * cv.width, d.y * cv.height, d.r * devicePixelRatio, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, []);
  return <canvas ref={ref} className="th-dust" aria-hidden="true" />;
}

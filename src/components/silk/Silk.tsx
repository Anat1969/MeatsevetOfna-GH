import { useEffect, useRef, useState } from 'react';
import type { SilkOpts } from './engine';

/** Live silk, lazy-loaded (three.js only arrives when a silk surface is on screen). */
export function SilkLive({ face, lining, seed = 0, className = '', interactive = true }: SilkOpts & { className?: string; interactive?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const silk = useRef<import('./engine').Silk | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true; let ro: ResizeObserver | null = null;
    import('./engine').then(({ Silk }) => {
      if (!alive || !ref.current) return;
      try {
        const s = new Silk(ref.current, { face, lining, seed });
        silk.current = s;
        const fit = () => { const r = ref.current!.getBoundingClientRect(); s.resize(Math.max(1, r.width), Math.max(1, r.height)); };
        fit(); ro = new ResizeObserver(fit); ro.observe(ref.current);
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) s.frame(3); else s.start();
        setReady(true);
      } catch { /* no WebGL: the gradient behind stays */ }
    });
    return () => { alive = false; ro?.disconnect(); silk.current?.dispose(); silk.current = null; };
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { silk.current?.setColors(face, lining); }, [face, lining]);
  return (
    <canvas ref={ref} className={`silk ${ready ? 'on' : ''} ${className}`} aria-hidden="true"
      onPointerMove={interactive ? (e) => { const r = e.currentTarget.getBoundingClientRect(); silk.current?.poke(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); } : undefined} />
  );
}

/** A still of the silk, as a fabric swatch photograph. */
export function SilkStill({ face, lining, seed = 0, className = '', alt = '' }: SilkOpts & { className?: string; alt?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { let alive = true; import('./engine').then(({ silkStill }) => silkStill({ face, lining, seed }).then((u) => alive && setSrc(u))); return () => { alive = false; }; }, [face, lining, seed]);
  return src ? <img className={`plate silk-still ${className}`} src={src} alt={alt} draggable={false} /> : <div className={`plate silk-wait ${className}`} style={{ background: `linear-gradient(150deg, ${face}, ${lining})` }} />;
}

import { motion } from 'framer-motion';
/**
 * The runway set as an architectural perspective: a long stone floor between two rows of hanging
 * linen panels. The panel next to the current look opens and shows the hidden lining (the collection's
 * accent colour). Depth = progress along the show.
 */
export function Stage({ palette, open = -1, children, compact }: { palette: { hex: string }[]; open?: number; children?: React.ReactNode; compact?: boolean }) {
  const linen = palette[0]?.hex ?? '#F3E6D2';
  const sand = palette[1]?.hex ?? '#D8C3A0';
  const lining = palette[4]?.hex ?? '#5E1F24';
  const VX = 800, VY = 330;
  const N = 7;
  // depth t: 0 = front, 1 = vanishing point
  const at = (t: number, x: number, y: number) => [VX + (x - VX) * (1 - t), VY + (y - VY) * (1 - t)] as const;
  const depth = (i: number) => 1 - Math.pow(0.78, i + 1);
  const panels: { d: string; side: number; i: number; folds: string[] }[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const t0 = i === 0 ? 0 : depth(i - 1), t1 = depth(i) - 0.012;
      const xo = VX + side * 720, xi = VX + side * 470;
      const [ax, ay] = at(t0, xo, -40), [bx, by] = at(t1, xo, -40), [cx, cy] = at(t1, xi, 930), [dx, dy] = at(t0, xi, 930);
      const folds: string[] = [];
      for (let k = 1; k < 6; k++) {
        const f = k / 6;
        const [px, py] = [ax + (bx - ax) * f, ay + (by - ay) * f];
        const [qx, qy] = [dx + (cx - dx) * f, dy + (cy - dy) * f];
        folds.push(`M${px.toFixed(1)} ${py.toFixed(1)} L${qx.toFixed(1)} ${qy.toFixed(1)}`);
      }
      panels.push({ d: `M${ax} ${ay} L${bx} ${by} L${cx} ${cy} L${dx} ${dy} Z`, side, i, folds });
    }
  }
  const floor = `M${VX - 30} ${VY + 10} L${VX + 30} ${VY + 10} L${VX + 420} 900 L${VX - 420} 900 Z`;
  return (
    <div className={`stage${compact ? ' compact' : ''}`}>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="floor" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={sand} stopOpacity=".9" /><stop offset="1" stopColor={linen} stopOpacity=".35" /></linearGradient>
          <radialGradient id="spot" cx=".5" cy=".55" r=".5"><stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <linearGradient id="panel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={linen} /><stop offset=".5" stopColor="#fff" /><stop offset="1" stopColor={linen} />
          </linearGradient>
        </defs>
        <rect width="1600" height="900" style={{ fill: 'var(--hall)' }} />
        <path d={floor} fill="url(#floor)" />
        {[0.2, 0.4, 0.6, 0.8].map((t) => { const [lx, ly] = at(t, VX - 420, 900); const [rx] = at(t, VX + 420, 900); return <path key={t} d={`M${lx} ${ly} L${rx} ${ly}`} style={{ stroke: 'var(--ink)' }} strokeOpacity=".12" />; })}
        <path d={`M${VX} ${VY + 10} L${VX} 900`} style={{ stroke: 'var(--ink)' }} strokeOpacity=".1" strokeDasharray="4 10" />
        <ellipse cx={VX} cy={780} rx="360" ry="90" fill="url(#spot)" />
        {panels.slice().reverse().map((p) => {
          const isOpen = p.i === open;
          return (
            <g key={`${p.side}${p.i}`}>
              <path d={p.d} style={{ fill: lining }} />
              <motion.g
                animate={{ opacity: isOpen ? 0.06 : 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
                <path d={p.d} fill="url(#panel)" style={{ stroke: 'var(--ink)' }} strokeOpacity=".18" />
                {p.folds.map((f, k) => <path key={k} d={f} style={{ stroke: 'var(--ink)' }} strokeOpacity=".09" />)}
              </motion.g>
            </g>
          );
        })}
      </svg>
      <div className="stage-fg">{children}</div>
    </div>
  );
}

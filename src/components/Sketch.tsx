import type { Content } from '../lib/types';
/** Fashion sketch in ink, coloured by the collection palette. Stands in until a photo exists. */
export function Sketch({ c, n, className }: { c: Content; n: number; className?: string }) {
  const p = c.palette.map((x) => x.hex);
  const body = p[n % 2 === 0 ? 1 : 0] ?? '#eee';
  const accent = p[4] ?? '#5E1F24';
  const embroid = [p[2], p[3]].filter(Boolean);
  const hems = [
    'M70 120 Q60 230 40 300 L160 300 Q140 230 130 120 Z',
    'M72 120 L58 300 L142 300 L128 120 Z',
    'M70 120 Q50 220 30 305 Q100 290 170 305 Q150 220 130 120 Z',
  ];
  return (
    <svg className={className} viewBox="0 0 200 360" role="img" aria-label={`סקיצה: ${c.looks[n - 1]?.name ?? ''}`}>
      <defs>
        <pattern id={`em${n}`} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="2.4" style={{ fill: embroid[0] }} /><circle cx="0" cy="0" r="1.6" style={{ fill: embroid[1] }} /><circle cx="14" cy="14" r="1.6" style={{ fill: embroid[1] }} />
        </pattern>
        <linearGradient id={`fade${n}`} x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity="1" /></linearGradient>
        <mask id={`m${n}`}><rect width="200" height="360" fill={`url(#fade${n})`} /></mask>
      </defs>
      <ellipse cx="100" cy="38" rx="13" ry="16" style={{ fill: 'none', stroke: 'var(--ink)' }} strokeWidth="1.2" />
      <path d="M100 54 L100 66" style={{ stroke: 'var(--ink)' }} strokeWidth="1.2" />
      <path d="M78 70 Q100 62 122 70 L130 120 L70 120 Z" style={{ fill: body, stroke: 'var(--ink)' }} strokeWidth="1.2" />
      <path d={hems[(n - 1) % 3]} style={{ fill: body, stroke: 'var(--ink)' }} strokeWidth="1.2" />
      <path d={hems[(n - 1) % 3]} style={{ fill: `url(#em${n})` }} mask={`url(#m${n})`} opacity={n === 3 ? 0.35 : 0.9} />
      <path d="M100 150 L88 300 L112 300 Z" style={{ fill: accent }} className="godet" />
      <path d="M70 120 L130 120" style={{ stroke: 'var(--ink)' }} strokeWidth="2" />
      <path d="M78 72 L64 140 M122 72 L136 140" style={{ stroke: 'var(--ink)' }} strokeWidth="1.2" fill="none" />
      <path d="M88 300 L84 345 M112 300 L116 345" style={{ stroke: 'var(--ink)' }} strokeWidth="1.2" />
    </svg>
  );
}

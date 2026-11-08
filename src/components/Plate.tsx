import type { Collection, Look } from '../lib/types';
import { primary } from '../lib/types';
import { plain } from '../lib/text';
import { SilkStill } from './silk/Silk';

/** Look colour: the face of the silk. Each look takes its own tone from the palette; the lining is the hidden colour. */
export const lookColors = (c: Collection, n: number) => {
  const p = c.palette.map((x) => x.hex);
  return { face: p[[0, 2, 1][(n - 1) % 3]] ?? p[0] ?? '#e9e2d6', lining: p[4] ?? p[3] ?? '#5E1F24' };
};

/** The look's photograph or film. Until one exists: a satin swatch in the look's colour, rendered in the browser. */
export function Plate({ c, l, video = true, className = '' }: { c: Collection; l: Look; video?: boolean; className?: string }) {
  const img = primary(l, 'image');
  const vid = video ? primary(l, 'video') : undefined;
  if (vid) return <video className={`plate ${className}`} src={vid.url} poster={img?.url} autoPlay muted loop playsInline />;
  if (img) return <img className={`plate ${className}`} src={img.url} alt={plain(l.name)} draggable={false} />;
  return <SilkStill {...lookColors(c, l.n)} seed={l.n} className={className} alt={`${plain(l.name)}: בד המשי של הלוק, ממתין לצילום`} />;
}

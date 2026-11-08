import type { Collection, Look } from '../lib/types';
import { primary } from '../lib/types';
import { plain } from '../lib/text';
import { SilkStill } from './silk/Silk';

/** White satin in three degrees of gloss, one per look: the placeholder carries no colour of its own. */
export const WHITE = { face: '#f1efea', lining: '#e4e0d8' };
export const glossOf = (n: number) => [0.15, 0.55, 0.95][(n - 1) % 3];
/** Look colour from the palette, kept for content that asks for it. */
export const lookColors = (c: Collection, n: number) => {
  const p = c.palette.map((x) => x.hex);
  return { face: p[[0, 2, 1][(n - 1) % 3]] ?? p[0] ?? '#e9e2d6', lining: p[4] ?? p[3] ?? '#5E1F24' };
};

/** The look's photograph or film. Until one exists: a satin swatch in the look's colour, rendered in the browser. */
export function Plate({ c, l, video = true, className = '', sound = false }: { c: Collection; l: Look; video?: boolean; className?: string; sound?: boolean }) {
  const img = primary(l, 'image');
  const vid = video ? primary(l, 'video') : undefined;
  if (vid) return <video className={`plate ${className}`} src={vid.url} poster={img?.url} autoPlay muted={!sound} loop playsInline />;
  if (img) return <img className={`plate ${className}`} src={img.url} alt={plain(l.name)} draggable={false} />;
  return <SilkStill {...WHITE} gloss={glossOf(l.n)} seed={l.n} className={className} alt={`${plain(l.name)}: משי לבן, ממתין לצילום`} />;
}

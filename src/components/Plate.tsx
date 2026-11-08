import type { Collection, Look } from '../lib/types';
import { primary } from '../lib/types';
import { plain } from '../lib/text';

/** The look's photograph (or film). Until one exists: a fabric plate in the collection palette, never a cartoon. */
export function Plate({ c, l, video = true, className = '' }: { c: Collection; l: Look; video?: boolean; className?: string }) {
  const img = primary(l, 'image');
  const vid = video ? primary(l, 'video') : undefined;
  if (vid) return <video className={`plate ${className}`} src={vid.url} poster={img?.url} autoPlay muted loop playsInline />;
  if (img) return <img className={`plate ${className}`} src={img.url} alt={plain(l.name)} draggable={false} />;
  const p = c.palette.map((x) => x.hex);
  const a = p[(l.n - 1) % 2] ?? '#EDE6DA', b = p[1] ?? '#D8C3A0', k = p[4] ?? '#5E1F24';
  return (
    <div className={`plate empty ${className}`} style={{ ['--a' as string]: a, ['--b' as string]: b, ['--k' as string]: k }} role="img" aria-label={`${plain(l.name)}: ממתין לצילום`}>
      <span className="plate-n">{String(l.n).padStart(2, '0')}</span>
      <span className="plate-name">{plain(l.name)}</span>
      <span className="plate-wait">ממתין לצילום</span>
    </div>
  );
}

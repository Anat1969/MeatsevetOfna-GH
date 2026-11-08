import { motion } from 'framer-motion';
/** Words that rise into place one after another, like a title sequence. */
export function Kinetic({ text, className = '', delay = 0, as = 'h1', step = 0.08 }: { text: string; className?: string; delay?: number; as?: 'h1' | 'h2' | 'p' | 'span'; step?: number }) {
  const T = motion[as];
  const words = text.split(' ');
  return (
    <T className={`kinetic ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="kw" aria-hidden="true">
          <motion.span initial={{ y: '110%' }} animate={{ y: '0%' }} transition={{ delay: delay + i * step, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}>{w}</motion.span>
        </span>
      ))}
    </T>
  );
}

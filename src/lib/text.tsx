import { Fragment } from 'react';
/** Renders **marks** as highlighter, per the distillation standard. */
export function Rich({ t, className }: { t?: string; className?: string }) {
  const parts = (t || '').split(/\*\*(.+?)\*\*/g);
  return <span className={className}>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}</span>;
}
export const plain = (t?: string) => (t || '').replace(/\*\*/g, '');

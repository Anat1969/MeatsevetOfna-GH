import { useEffect, useState } from 'react';
export type Route = { name: 'home' | 'studio' | 'show' | 'sets'; id?: string; look?: number };
export function parse(h: string): Route {
  const [, a = '', b = '', c = ''] = h.replace(/^#/, '').split('/');
  if (a === 'studio') return { name: 'studio', id: b || undefined };
  if (a === 'show') return { name: 'show', id: b || undefined, look: c ? Number(c) : undefined };
  if (a === 'sets') return { name: 'sets' };
  return { name: 'home' };
}
export const go = (h: string) => { if (location.hash !== h) location.hash = h; };
export function useRoute() {
  const [r, set] = useState(parse(location.hash));
  useEffect(() => { const f = () => { set(parse(location.hash)); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}

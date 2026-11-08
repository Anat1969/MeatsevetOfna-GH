import { useEffect, useRef } from 'react';
import { go, type Route } from '../router';

declare global { namespace JSX { interface IntrinsicElements { 'ai-menu': Record<string, unknown> } } }

const NAV: { r: Route['name']; label: string; href: string }[] = [
  { r: 'home', label: 'בית', href: '#/' },
  { r: 'studio', label: 'סטודיו', href: '#/studio' },
  { r: 'show', label: 'מסלול', href: '#/show' },
  { r: 'sets', label: 'תפאורות 2026', href: '#/sets' },
];

export type MenuItem = { label: string; onSelect: () => void; pressed?: boolean };

export function TopBar({ route, items, status }: { route: Route; items?: MenuItem[]; status?: string }) {
  const ref = useRef<HTMLElement & { items?: MenuItem[]; status?: string }>(null);
  useEffect(() => { if (ref.current) { ref.current.items = items ?? []; ref.current.status = status ?? ''; } }, [items, status]);
  return (
    <header className={`bar${route.name === "home" || route.name === "show" ? " dark" : ""}`}>
      <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('#/'); }} aria-label="מסלול, לדף הבית">
        <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><path d="M12 56 L28 10 L36 10 L52 56 Z" fill="currentColor" /><path d="M32 22 L26 56 L38 56 Z" fill="var(--bordo)" /></svg>
        <span>מסלול</span>
      </a>
      <nav className="nav">
        {NAV.map((n) => (
          <a key={n.r} href={n.href} className={route.name === n.r ? 'on' : ''} aria-current={route.name === n.r ? 'page' : undefined}>{n.label}</a>
        ))}
      </nav>
      <ai-menu ref={ref} phone="" chat="https://claude.ai/code/session_01UBnSCJojRPTLhbYDZAQ84H"></ai-menu>
    </header>
  );
}

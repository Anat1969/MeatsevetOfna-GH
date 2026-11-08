import { TopBar } from './components/TopBar';
import { Home } from './pages/Home';
import { Show } from './pages/Show';
import { Studio } from './pages/Studio';
import { Sets } from './pages/Sets';
import { useRoute } from './router';

export default function App() {
  const r = useRoute();
  return (
    <>
      <TopBar route={r} />
      {r.name === 'home' && <Home />}
      {r.name === 'studio' && <Studio id={r.id} />}
      {r.name === 'show' && <Show key={r.id ?? 'x'} id={r.id} look={r.look} />}
      {r.name === 'sets' && <Sets />}
    </>
  );
}

import { createRoot } from 'react-dom/client';
import App from './App';
// the fonts ship with the app: no wait for another server, and a downloaded article keeps its type
import '@fontsource/frank-ruhl-libre/300.css';
import '@fontsource/frank-ruhl-libre/400.css';
import '@fontsource/frank-ruhl-libre/500.css';
import '@fontsource/frank-ruhl-libre/700.css';
import '@fontsource/ibm-plex-sans-hebrew/300.css';
import '@fontsource/ibm-plex-sans-hebrew/400.css';
import '@fontsource/ibm-plex-sans-hebrew/500.css';
import '@fontsource/ibm-plex-sans-hebrew/600.css';
import '@fontsource/ibm-plex-sans-hebrew/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(<App />);
if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('./sw.js').catch(() => {});

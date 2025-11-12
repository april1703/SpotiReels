import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import Search from './pages/Search';
import { Sidebar, Player } from './pages/Sidebar';
import useAuth from './pages/useAuth';
import Settings from './pages/Settings';
import Register from './pages/Register';
import LikedSongs from './pages/LikedSongs';
import CreatePlaylistModal from './pages/CreatePlaylistPopup';
import './pages/theme.css';
import { ThemeProvider } from './pages/ThemeSwitch';
import Reels from './pages/Reels';

// main app: routing + global player state (trackUri + queue)
export default function App() {
  const code = new URLSearchParams(window.location.search).get('code');
  const hookAccessToken = useAuth(code);

  // fallback token so player doesn't disappear on refresh
  const accessToken =
    hookAccessToken ||
    (typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null);

  // SPA path state so pushState updates the UI seamlessly
  const [path, setPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '/');

  // single selected track (clicked item)
  const [trackUri, setTrackUri] = useState(null);

  // NEW: a queue of URIs (e.g., rest of a playlist starting from clicked track)
  const [trackQueue, setTrackQueue] = useState([]);

  const [showCreate, setShowCreate] = useState(false);

  // keep path in sync with history
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // listen for single-track play events fired from anywhere
  useEffect(() => {
    const onPlay = (e) => {
      const uri = e?.detail?.uri;
      if (uri) setTrackUri(uri);
    };
    window.addEventListener('player:play', onPlay);
    return () => window.removeEventListener('player:play', onPlay);
  }, []);

  // NEW: listen for a queue being provided (e.g., from PlaylistContentPopup)
  useEffect(() => {
    const onQueue = (e) => {
      const q = e?.detail?.queue;
      if (Array.isArray(q) && q.length) setTrackQueue(q);
    };
    window.addEventListener('player:queue', onQueue);
    return () => window.removeEventListener('player:queue', onQueue);
  }, []);

  const handlePlay = (uri) => {
    setTrackUri(uri);
  };

  if (path === '/register') return <Register />;

  // show Login only when no authorization has been made (also used for Logout)
  const showLogin = !accessToken && !code && (path === '/' || path === '/login');
  if (showLogin) return <Login />;

  const norm = path.toLowerCase();
  const isLikedSongs =
    norm === '/likedsongs' ||
    norm === '/liked-songs' ||
    norm === '/likes' ||
    norm === '/liked';

  let Content;
  if (norm === '/search') {
    Content = <Search accessToken={accessToken} setTrackUri={handlePlay} />;
  } else if (norm === '/settings') {
    Content = <Settings />;
  } else if (isLikedSongs) {
    Content = <LikedSongs accessToken={accessToken} setTrackUri={handlePlay} />;
  } else if (norm === '/reels') {
    Content = <Reels accessToken={accessToken} setTrackUri={handlePlay} />;
  } else {
    Content = <Home code={code} accessToken={accessToken} setTrackUri={handlePlay} />;
  }

  return (
    <ThemeProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <Sidebar onOpenCreatePlaylist={() => setShowCreate(true)} />
        <div style={{ marginLeft: 220, padding: '80px 24px 120px 24px' }}>
          {Content}
        </div>
        <div
          style={{
            position: 'fixed',
            left: 220,
            right: 0,
            bottom: 0,
            padding: 0,
            zIndex: 200,
            background: 'var(--bg)',
            borderTop: '1px solid var(--border)',
          }}
        >
          {/* pass both the single track and the queue */}
          <Player accessToken={accessToken} trackUri={trackUri} trackQueue={trackQueue} />
        </div>
        <CreatePlaylistModal
          accessToken={accessToken}
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
        />
      </div>
    </ThemeProvider>
  );
}

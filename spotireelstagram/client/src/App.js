import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import Search from './pages/Search';
import Sidebar from './Sidebar';
import Player from './Player';
import useAuth from './useAuth';

//APP.JS EXPLANATION
// main kinda global app component
// handles routing between Login, Home, and Search pages
// trackURI's state is stored here (so it can get passed to the player for trackURI (song) data)
// manages access token and track URI state
// passes access token to Player component to enable music playback

export default function App() {
  const code = new URLSearchParams(window.location.search).get('code');
  const hookAccessToken = useAuth(code);

  // fallsback to a consistent token so player doesn't disappear
  const accessToken = hookAccessToken || (typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null);

  // track pathname in state so SPA navigation (pushState) can update the UI seamlessly
  const [path, setPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '/');
  const [trackUri, setTrackUri] = useState(null);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // show Login only when no authorization has been made, which is used for Logout as well
  const showLogin = !accessToken && !code && (path === '/' || path === '/login');
  if (showLogin) return <Login />;

  let Content = null;
  if (path === '/search') Content = <Search accessToken={accessToken} setTrackUri={setTrackUri} />;
  else Content = <Home code={code} accessToken={accessToken} setTrackUri={setTrackUri} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ marginLeft: 220, padding: '80px 24px 120px 24px' }}>
        {Content}
      </div>

      <div style={{ position: 'fixed', left: 220, right: 0, bottom: 0, padding: 0, zIndex: 200, backgroundColor: '#000000ff' }}>
        <Player accessToken={accessToken} trackUri={trackUri} />
      </div>
    </div>
  );
}

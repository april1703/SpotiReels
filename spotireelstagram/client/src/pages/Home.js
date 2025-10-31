import { Container } from 'react-bootstrap'
import { useState, useEffect, useMemo } from 'react'
import { FaMinus, FaTimes } from "react-icons/fa"
import "./Home.css";
import PlaylistContentPopup from "./PlaylistContentPopup.jsx";

export default function Home({ accessToken, setTrackUri }) { // <— add setTrackUri so the popup can play
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null); // <— selected playlist id to open popup

  const headers = useMemo(() => (
    accessToken ? { Authorization: `Bearer ${accessToken}` } : null
  ), [accessToken]);

  const close = () => window.close();
  const minimize = () => { document.body.style.display = "none"; };

  useEffect(() => {
    if (!headers) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      const all = [];
      let url = "https://api.spotify.com/v1/me/playlists?limit=50";

      try {
        while (url) {
          const r = await fetch(url, { headers });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          all.push(...(data.items || []));
          url = data.next; // page through results
          if (cancelled) return;
        }
        if (!cancelled) setPlaylists(all);
      } catch (e) {
        if (!cancelled) setErr("Couldn't load playlists. Check login/scopes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [headers]);


  //css code, functionality ^^
  return (
    <Container fluid className="home-container">
      {/*fixed navbar so its aligned with everything*/}
      <div className="navbar">
        <div className='navbar-buttons'>
          <button onClick={minimize} className='window-button' title="Minimize"><FaMinus /></button>
          <button onClick={close} className='window-button' title="Close"><FaTimes /></button>
        </div>
      </div>
      <div className='navbar-space'/>
      
      {loading ? (
        <p className='loading-text'>Loading playlists...</p>) :(
        <div className="playlist-grid">{playlists.map(p => {
          return (
              <button
                key={p.id}
                className="playlist-card"
                onClick={() => setOpenId(p.id)}
                title={`Open ${p.name}`}
                style={{ textAlign: "left" }}
              >
                <div className="playlist-card" key={p.id}>
                  <h3 className="playlist-name">{p.name}</h3>
                  <p className='playlist-tracks'>{p.tracks.total} songs</p>
                  </div>
                  </button>
                  );
                }
                )}
                </div>
              )}
              <PlaylistContentPopup
              accessToken={accessToken}
              playlistId={openId}
              isOpen={!!openId}
              onClose={() => setOpenId(null)}
              onPlay={(uri) => setTrackUri?.(uri)}
              />
              </Container>
              );
            }

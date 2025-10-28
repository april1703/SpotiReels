import { Container } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { FaMinus, FaTimes } from "react-icons/fa"
import "./Home.css";
  


export default function Home() {
  const [ playlists, setPlaylists ] = useState([]);
  const [ loading, setLoading ] = useState(true);
  
  useEffect(() => {
    async function getPlaylists() {
      try {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) {
          console.error("Missing Spotify access token.");
          return;
        }
        const res = await fetch("https://api.spotify.com/v1/me/playlists", {
          headers: { Authorization: `Bearer ${token}`},
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPlaylists(data.items || []);
      }

      catch (err) {
        console.error("Failed to load playlists:", err);
      }
      finally {
        setLoading(false);
      }
    }
    getPlaylists();

  }, []);


  const close = () => {
    window.close();
  };

  const minimize = () => {
    document.body.style.display = "none";
  };


  // css code, functionality ^^
  return (
    <Container fluid className="home-container">
      {/*fixed navbar so its aligned with everything*/}
      <div className="navbar">
        <div className='navbar-buttons'>
          <button onClick={minimize} className='window-button' title="Minimize">
            <FaMinus />
          </button>

          <button onClick={close} className='window-button' title="Close">
            <FaTimes />
          </button>
        </div>
      </div>
      <div className='navbar-space'/>
      {loading ? (
        <p className='loading-text'>Loading playlists...</p>
      ) : (
        <div className="playlist-grid">{playlists.map((p) => (
          <div className="playlist-card" key={p.id}>
            <h3 className="playlist-name">{p.name}</h3>
            <p className='playlist-tracks'>{p.tracks.total} songs</p>
        </div>
        ))}
        </div>
      )}
    </Container>
  );
}

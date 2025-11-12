import { FaHome, FaSearch, FaHeart, FaPlus, FaFilm, FaCog } from "react-icons/fa"
import SpotifyPlayer from 'react-spotify-web-playback'
import { useMemo, useState, useEffect } from 'react';
import AddToPlaylistPopup from "./AddToPlaylistPopup";

// Player bar at bottom — now supports a queue (playlist continuation)
function Player({ accessToken, trackUri, trackQueue = [] }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [currentTrackUri, setCurrentTrackUri] = useState(trackUri || "");
  const [play, setPlay] = useState(false);

  useMemo(() => !!trackUri, [trackUri]);

  // when a new track (or new queue) is provided, start playing immediately
  useEffect(() => {
    if (trackUri || (trackQueue && trackQueue.length)) {
      setPlay(true);
    }
  }, [trackUri, trackQueue]);

  if (!accessToken) return null;

  const urisToPlay = trackQueue && trackQueue.length
    ? trackQueue
    : (trackUri ? [trackUri] : []);

  return (
    <div style={{ width: '100%', padding: 0, margin: 0, background: '#000000ff', position: 'relative' }}>
      <SpotifyPlayer
        token={accessToken}
        showSaveIcon
        play={play}
        uris={urisToPlay}
        callback={(state) => {
          if (typeof state.isPlaying === 'boolean') setPlay(state.isPlaying);
          try {
            if (state && state.track && state.track.uri) setCurrentTrackUri(state.track.uri);
          } catch (e) {
            // ignore
          }
        }}
        styles={{
          bgColor: '#000000ff',
          color: '#ffffff',
          loaderColor: '#8e2dd2',
          sliderColor: '#8e2dd2',
          sliderHandleColor: '#ffffff',
          trackArtistColor: '#b3b3b3',
          trackNameColor: '#ffffff'
        }}
      />

      {currentTrackUri && (
        <div style={{ position: 'fixed', right: 16, bottom: 92, zIndex: 1300 }}>
          <button
            title="Add +"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPickerOpen(true); }}
            style={{
              background: 'rgba(20,20,20,0.95)',
              border: '1px solid #444',
              borderRadius: 20,
              padding: '8px 12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
            }}
          >
            Add +
          </button>
        </div>
      )}

      <AddToPlaylistPopup
        accessToken={accessToken}
        trackUri={currentTrackUri}
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

// navigation bar between different pages (home, liked songs, search, settings, reels)

const Sidebar = ({ onOpenCreatePlaylist }) => {
    const go = (path) => () => { 
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };
    return (
        <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "220px",
                    height: "100vh",
                    backgroundColor: "#000000ff",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: "20px",
                    borderRight: "1px solid #000000ff",
                    zIndex: 100
                }}
                >
            <h4 style={{ color: "#8e2dd2ff", marginBottom: "40px"}}>SpotiReels</h4>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    width: "100%"
                }}
                >
                    <button style={navButtonStyle} onClick={go("/home")}><FaHome />Home</button>
                    <button style={navButtonStyle} onClick={go("/search")}><FaSearch/>Search</button>
                    <button style={navButtonStyle} onClick={go("/LikedSongs")}><FaHeart/>Liked Songs</button>
                    <button style={navButtonStyle} onClick={onOpenCreatePlaylist}><FaPlus/>New Playlist</button>
                    <button style={navButtonStyle} onClick={go("/reels")}><FaFilm />Reels</button>
                    <button style={navButtonStyle} onClick={go("/settings")}><FaCog />Settings</button>
                </div>
        </div>
    )
}

const navButtonStyle = {
    backgroundColor: "transparent",
    color: "white",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 20px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontSize: "16px"
};

export {Sidebar, Player};


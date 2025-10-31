import SpotifyPlayer from 'react-spotify-web-playback'
import React, { useMemo, useState, useEffect } from 'react';
import AddToPlaylistPopup from "./AddToPlaylistPopup";

//PLAYERBAR EXPLANATION
//Playerbar at bottom
//does not render if there's no access token
//plays tracks by passing the player a trackURI
//player plays music by giving the trackURI to Spotify's Web Playback SDK (API stuff)
//now plays songs as soon as its clicked via search or wherever.

export default function Player({ accessToken, trackUri }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // track the currently playing track's URI from the Spotify player state
  const [currentTrackUri, setCurrentTrackUri] = useState(trackUri || "");
  // control 'play' so selecting a new track starts play IMMEDIATELY regardles of player state
  const [play, setPlay] = useState(false);

  const hasTrack = useMemo(() => !!trackUri, [trackUri]);

  // when a new track is selected, ensure playback starts
  useEffect(() => {
    if (trackUri) setPlay(true);
  }, [trackUri]);

  if (!accessToken) return null;

  return (
    <div style={{ width: '100%', padding: 0, margin: 0, background: '#000000ff', position: 'relative' }}>
      {/* the actual spotify player */}
      <SpotifyPlayer
        token={accessToken}
        showSaveIcon
        play={play}
        uris={trackUri ? [trackUri] : []}
        // callback keeps `play` state in sync with the actual player
        callback={(state) => {
          // state.isPlaying indicates whether Spotify is playing
          if (typeof state.isPlaying === 'boolean') setPlay(state.isPlaying);
          // state.track may contain the currently playing track info (including uri)
          try {
            if (state && state.track && state.track.uri) setCurrentTrackUri(state.track.uri);
          } catch (e) {
            
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
      {/* Add to playlist button placed over the player bar */}
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
        // use the currently playing track when opening from this button
        trackUri={currentTrackUri}
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}



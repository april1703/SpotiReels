import SpotifyPlayer from 'react-spotify-web-playback'
import React, { useMemo, useState, useEffect } from 'react';

//PLAYERBAR EXPLANATION
//Playerbar at bottom
//does not render if there's no access token
//plays tracks by passing the player a trackURI
//player plays music by giving the trackURI to Spotify's Web Playback SDK (API stuff)
//now plays songs as soon as its clicked via search or wherever.

export default function Player({ accessToken, trackUri }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // control 'play' so selecting a new track starts play IMMEDIATELY regardles of player state
  const [play, setPlay] = useState(false);

  const hasTrack = useMemo(() => !!trackUri, [trackUri]);

  // when a new track is selected, ensure playback starts
  useEffect(() => {
    if (trackUri) setPlay(true);
  }, [trackUri]);

  if (!accessToken) return null;

  return (
    <div style={{ width: '100%', padding: 0, margin: 0, background: '#000000ff' }}>
      {/* the actual spotify player */}
      <SpotifyPlayer
        token={accessToken}
        showSaveIcon
        play={play}
        uris={trackUri ? [trackUri] : []}
        // callback keeps local `play` state in sync with the actual player
        callback={(state) => {
          // state.isPlaying indicates whether Spotify is playing
          if (typeof state.isPlaying === 'boolean') setPlay(state.isPlaying);
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
    </div>
  );
}


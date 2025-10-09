import SpotifyPlayer from 'react-spotify-web-playback'

//PLAYERBAR EXPLANATION
//Playerbar at bottom
//does not render if there's no access token
//plays tracks by passing the player a trackURI
//player plays music by giving the trackURI to Spotify's Web Playback SDK (API stuff)

export default function Player({ accessToken, trackUri }) {
  if (!accessToken) return null
  return (
    <div style={{ width: '100%', padding: 0, margin: 0 }}>
      <SpotifyPlayer
        token={accessToken}
        showSaveIcon
        uris={trackUri ? [trackUri] : []}
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
  )
}

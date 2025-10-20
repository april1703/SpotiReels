import { Container } from 'react-bootstrap'
import { FaSpotify } from "react-icons/fa"


//LOGIN PAGE EXPLAINED
//creates an AUTH_URL with client ID, redirect URI, and a list of scopes (streaming, playback, library read/write, user read email/private)
//initially asks user to consent to their Spotify being used after hitting Login
//redirects to login page.

//put your client id after where it says client_id and in between &
const AUTH_URL = "https://accounts.spotify.com/authorize?client_id=" + String(process.env.SPOTIFY_CLIENT_ID) + "&response_type=code&redirect_uri=http://127.0.0.1:3000/auth/callback&scope=streaming%20user-read-email%20user-read-private%20user-library-read%20user-library-modify%20user-read-playback-state%20user-modify-playback-state"

export default function Login() {
  return (
    <Container
    fluid 
      className='d-flex flex-column justify-content-center align-items-center' 
      style={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1aff" }}
    >

      {/* Spotify Icon */}

      <FaSpotify 
        size={190}
        color="#8e2dd2ff"
        style={{
          marginBottom: "10px", 
          animation: "pulse 2s infinite"
        }}
        />
        <h1
          style={{
            color: "#8e2dd2ff",
            fontWeight: "bold",
            fontSize: "2rem",
            marginBottom: "30px"
          }}
        >
          SpotiReelsTagram
        </h1>
      {/* Adding a two text boxes for username and password */}

      <input
        type="text"
        placeholder='Username'
        style={{
            width: "250px",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px",
        }}
        />

        <input
          type="text"
          placeholder="Password"
          style = {{
            width: "250px",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px"
          }}
        />

      <a href={AUTH_URL}
         style={{
          backgroundColor: "#8e2dd2ff",
          color: "white",
          padding: "10px 50px",
          borderRadius: "5px",
          textDecoration: "none",
          fontSize: "18px",  
         }}
         >
          Login
      </a>
      {/* Pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.9; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
  </Container>
  )
}

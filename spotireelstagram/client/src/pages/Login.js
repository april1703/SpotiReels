import { Container } from 'react-bootstrap'
import { FaSpotify } from "react-icons/fa"
import { useState } from "react";

//LOGIN PAGE EXPLAINED
//creates an AUTH_URL with client ID, redirect URI, and a list of scopes (streaming, playback, library read/write, user read email/private)
//initially asks user to consent to their Spotify being used after hitting Login
//redirects to login page.

//put your client id after where it says client_id and in between &
async function getSpotifyId() {
  try {
    const res = await fetch("http://localhost:3001/spotify-id");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("Returned successfully:", data);
    return data;
  } catch (err) {
    console.error("Network error:", err.message);
  }
}

const SPOTIFY_ID = await getSpotifyId(); // if in top-level await context
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_ID}&response_type=code&redirect_uri=http://127.0.0.1:3000/auth/callback&scope=streaming%20user-read-email%20user-read-private%20user-library-read%20user-library-modify%20user-read-playback-state%20user-modify-playback-state%20playlist-modify-public%20playlist-modify-private`;

export default function Login() {
  const go = (path) => () => { 
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

  const [formData, setFormData] = useState({
        username: '',
        password: ''
      });

  const [message, setMessage] = useState('');

  // Handles inputs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
          ...prevData,
          [name]: value,
        }));
    };

    const handleSubmit = (event) => {
      event.preventDefault();

      const { username, password } = formData;
      
      if (!username || !password ) {
        setMessage("Please enter username and password.");
        return;
      }

      fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ username, password })

      })
       .then(async (data) => {
          switch(data.status) {
            case 200:
              console.log("Login successful, redirecting to home screen...");
              window.location.href = "/home";
              return;
            
            case 404:
              console.error("Username or password does not match database");
              setMessage("Wrong username or password, try again")
              break;

            case 500:
              console.error("500: Database error: " + data.status);
              setMessage("Database error");
              break;

            default:
            setMessage("Default Database error "); 
            console.error("Unexpected response status: " + data.status);
          }
     
       })
       .catch((err) => {
          console.error("Unexpected error: " + err.message);
         
       }) 
      }
    

  return (
    <Container
    fluid 
      className='d-flex flex-column justify-content-center align-items-center' 
      style={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1aff" }}
    >

    <form onSubmit={handleSubmit}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>

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
          SpotiReels
        </h1>
      {/* Adding a two text boxes for username and password */}

      <input
        type="text"
        name="username"
        placeholder='Username'
        value={formData.username}
        onChange={handleChange}
        style={{
            width: "250px",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px"
        }}
        />

        <input
          className="textbox"
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          style = {{
            width: "250px",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px"
          }}
        />

      <button
          type="submit"
          style={{
            backgroundColor: "#8e2dd2ff",
            color: "white",
            padding: "10px 50px",
            borderRadius: "5px",
            border: "none",
            fontSize: "18px",
            cursor: "pointer"
          }}
          >
            Login
          </button>
  <button
      style={{background: "none", 
        border: "none",   
        margin: 0,      
        padding: 30,     
        color: "#8e2dd2ff",  
        fontSize: "15px",   
        cursor: "pointer", 
        textDecoration: "underline"}}
        onClick={go("/register")}>
          Don't have an account? Register here!
        </button>
        
        {message && (
            <p 
            style={{
              color: "white",
              marginTop: "20px"
            }}>
              {message}
            </p>
          )}
        
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
    </form>
  </Container>
  )
}

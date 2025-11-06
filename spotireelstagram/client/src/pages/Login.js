import { Container } from 'react-bootstrap'
import { FaSpotify } from "react-icons/fa"
import { useState } from "react";
import "./Login.css";

//LOGIN PAGE EXPLAINED
//creates an AUTH_URL with client ID, redirect URI, and a list of scopes (streaming, playback, library read/write, user read email/private)
//initially asks user to consent to their Spotify being used after hitting Login
//redirects to login page.

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

// Retrieve cookie - send username to backend
function getCookie(name) {
  let value = `; ${document.cookie}`;
  let parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return parts.pop().split(';').shift();
}

const SPOTIFY_ID = await getSpotifyId();
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_ID}&response_type=code&redirect_uri=http://127.0.0.1:3000/auth/callback&scope=streaming%20user-read-email%20user-read-private%20user-library-read%20user-library-modify%20user-read-playback-state%20user-modify-playback-state%20playlist-modify-public%20playlist-modify-private&show_dialog=true`;

export default function Login() {
  const go = (path) => () => { 
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

  const [formData, setFormData] = useState({username: '', password: ''});
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

      fetch("http://127.0.0.1:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ username, password })
        
      })
      .then(async (data) => {
        switch(data.status) {
          case 200:
            console.log("Login successful, redirecting to home screen...");
            try {
              const response = await data.json();
              const token = response.token;
              
              if (token) {
                console.log("JWT stored as cookie.");
                document.cookie = `token=${token}; Path=/; SameSite=None; Secure`;
                window.localStorage.setItem('currentUser', username);
                window.location.href = AUTH_URL;
                console.log(`token=${token}`);
                } else{
                  console.error("No token received in response")
                  setMessage("ERROR HERE")
                }
              } catch(err) {
                  console.log("Failed to parse response body: ", err);
                  setMessage("ERROR HERE")
              }
              return;

            case 403:
              console.log("Incorrect password...");
              setMessage("Incorrect password.");
              break;
            
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
    <Container fluid className="login-container">

    <form className="login-form" onSubmit={handleSubmit}>

      {/* Spotify Icon */}

      <FaSpotify 
        size={190}
        color="#8e2dd2ff"
        className="spotify-icon"/>
        <h1 className='login-title'>
          SpotiReels
        </h1>
      {/* Adding a two text boxes for username and password */}

      <input
        type="text"
        name="username"
        placeholder='Username'
        value={formData.username}
        onChange={handleChange}
        className='login-input'
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className='login-input'
          />

      <button type="submit" className='login-button'>
        Login
        </button>
  
      <button onClick={go("/register")} className='register-link'>
        Don't have an account? Register here!
        </button>
        
        {message && <p className='login-message'>{message}</p>}
        
    </form>
  </Container>
  )
}

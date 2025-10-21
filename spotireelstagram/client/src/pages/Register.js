import { Container } from 'react-bootstrap'
import { useState } from "react";

export default function Register() {
  
    const [username, setUsername] = useState("");
    const [spotifyUser, setSpotifyUser] = useState("");
    const [password, setPassword] = useState("");
    const [passwordCheck, setPasswordCheck] = useState("");
    const [message, setMessage] = useState("")

    const handleRegister = (input) => {

      if (!username || !spotifyUser || !password || !passwordCheck) {
        setMessage("Please fill out all fields.");
        return;
      }

      if (password !== passwordCheck) {
        setMessage("Passwords do not match.");
        return; 
      }

    }

  return (
    <Container
    fluid 
      className='d-flex flex-column justify-content-center align-items-center' 
      style={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1aff" }}
    >

      <h1 class="title" 
      style={{ 
        padding: "50px",
        color: "#8e2dd2ff",
        fontweight: "bold"
      }}>Register with SpotiReels</h1>
      
      
      {/* Adding text boxes for username and password */}

      <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "20px"
        }}
        >
        <input
          class="textbox"
          type="text"
          placeholder='Type username here...'
          value={username}
          onChange={(input) => setUsername(input.target.value)}
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
        class="textbox"
        type="text"
        placeholder='Type spotify username here...'
        value={spotifyUser}
        onChange={(input) => setSpotifyUser(input.target.value)}
        style={{
            width: "250px",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px",
        }}
        />
        </div>

      <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "20px"
        }}
        >
        <input
          className="textbox"
          type="text"
          placeholder="Type password here..."
          value={password}
          onChange={(input) => setPassword(input.target.value)}
          style = {{
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
          type="text"
          placeholder="Retype password..."
          value={passwordCheck}
          onChange={(input) => setPasswordCheck(input.target.value)}
          style = {{
            width: "250px",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px"
          }}
        />
        </div>

        <button
          type="submit"
          onClick={handleRegister}
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
            Register
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
          
  </Container>
  )
}
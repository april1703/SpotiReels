import { Container } from 'react-bootstrap'
import { useState } from "react";

export default function Register() {
    const go = (path) => () => { 
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const [formData, setFormData] = useState({
      username: '',
      spotifyUser: '',
      password: '',
      checkPassword: '',
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

    // Handles form submission
    const handleSubmit = (event) => {
      // prevents a blank form submission
      event.preventDefault();

      const { username, spotifyUser, password, checkPassword } = formData;

      if (!username || !spotifyUser || !password || !checkPassword) {
        setMessage("Please fill out all fields.");
        return;
      }

      if (password !== checkPassword) {
        setMessage("Passwords do not match.");
        return; 
      }

      setMessage('Registration successful');
      console.log('Form data submitted', formData);
    }

  return (
    <Container
    fluid 
      className='d-flex flex-column justify-content-center align-items-center' 
      style={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1aff" }}
    >

    <form onSumbit={handleSubmit}>

      <h1 class="title" 
      style={{ 
        padding: "50px",
        color: "#8e2dd2ff",
        fontweight: "bold"
      }}
      >
        Register with SpotiReels
        </h1>
      
      
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
          name="username"
          placeholder='Type username here...'
          value={formData.username}
          onChange={handleChange}
          style={inputStyle}
          />

        <input
        class="textbox"
        type="text"
        name="spotifyUser"
        placeholder='Type spotify username here...'
        value={formData.spotifyUser}
        onChange={handleChange}
        style={inputStyle}
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
          name="password"
          placeholder="Type password here..."
          value={formData.password}
          onChange={handleChange}
          style = {inputStyle}
        />
        <input
          className="textbox"
          type="text"
          name="checkPassword"
          placeholder="Retype password..."
          value={formData.checkPassword}
          onChange={handleChange}
          style = {inputStyle}
        />
        </div>
        <div
        style={{
          display: "flex",
          gap: "15px",
          marginBottom: "20px"
        }}
        >
        <button
          type="submit"
          onClick={handleSubmit}
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

          <button
          type="submit"
          onClick={go("/login")}
          style={{
            backgroundColor: "#8e2dd2ff",
            color: "white",
            padding: "10px 50px",
            borderRadius: "5px",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            position: "sticky"
          }}
          >
            Login
          </button>

        </div>
          
          {message && (
            <p 
            style={{
              color: "white",
              marginTop: "20px"
            }}>
              {message}
            </p>
          )}
    </form>
    </Container>
  )
}

const inputStyle = {
  width: "250px",
  padding: "10px",
  marginBottom: "20px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "16px"
}
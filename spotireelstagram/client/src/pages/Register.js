import { Container } from 'react-bootstrap'
import { useState } from "react";
import "./Register.css";

export default function Register() {

    const [formData, setFormData] = useState({
      username: '',
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

      const { username, password, checkPassword } = formData;

      if (!username || !password || !checkPassword) {
        setMessage("Please fill out all fields.");
        return;
      }

      if (password !== checkPassword) {
        setMessage("Passwords do not match.");
        return;
      }

        fetch("http://localhost:3001/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username, password: password }),
        })
        .then(async (resp) => {
            const data = await resp.json().catch(() => ({}));
            switch (resp.status) {
              case 201:
                console.log("Registration successful, redirecting to homepage...")
                setMessage("Registered successfully. Login with SpotiReels!")
                window.location.href = "/login";
                break;

              case 409:
                console.log("User already exists");
                setMessage("This username has been taken please try again.")
                break;
              case 500: 
                console.error("Server error:", resp.statusText, data);
                
                break;
              default:
                console.error("Unexpected error:", resp.status, data);
            }
        })
        .catch((err) => {
          console.error("Unexpected error:", err);
          setMessage("Error occurred during registration")
        });
      };

    const go = (path) => () => { 
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };
    

  return (
    <Container fluid className="register-container">
    <form onSubmit={handleSubmit} className="register-form">
      <h1 className='register-title'>Register with SpotiReels</h1>
      
        <input
          type="text"
          name="username"
          placeholder='Type username here...'
          value={formData.username}
          onChange={handleChange}
          className="register-input"
          />
    
        <input
          type="password"
          name="password"
          placeholder="Type password here..."
          value={formData.password}
          onChange={handleChange}
          className="register-input"
        />

        <input
          type="password"
          name="checkPassword"
          placeholder="Retype password..."
          value={formData.checkPassword}
          onChange={handleChange}
          className="register-input"
        />
     
        <button type="submit" className='register-button'>Register</button>
        <button onClick={go("/login")} className='login-link'>Already have an account? Login here!</button>

          {message && <p className='register-message'>{message}</p>}
    </form>
    </Container>
  )
}

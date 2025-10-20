import { Container } from 'react-bootstrap'

export default function Register() {
  return (
    <Container
    fluid 
      className='d-flex flex-column justify-content-center align-items-center' 
      style={{ width: "100%", height: "100vh", backgroundColor: "#1a1a1aff" }}
    >

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
  </Container>
  )
}
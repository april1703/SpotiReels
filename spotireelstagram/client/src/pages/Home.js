import { Container } from 'react-bootstrap'
import { FaMinus, FaTimes } from "react-icons/fa"
import "./Home.css";

export default function Home() {

  const close = () => {
    window.close();
  };

  const minimize = () => {
    document.body.style.display = "none";
  };

  return (
    <Container
      fluid
      className="home-container">
      {/*fixed navbar so its aligned with everything*/}
      <div className="navbar">
        <div className='navbar-buttons'>
          <button onClick={minimize} className='window-button' title="Minimize">
            <FaMinus />
          </button>

          <button onClick={close} className='window-button' title="Close">
            <FaTimes />
          </button>
        </div>
      </div>
      <div className='navbar-space' />

      {/* content for home will go here */}
      <div style={{ padding: "16px 24px" }}>
      </div>
    </Container>
  );
}

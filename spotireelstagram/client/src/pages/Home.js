import { Container } from 'react-bootstrap'
import { FaMinus, FaTimes } from "react-icons/fa"

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
      className="d-flex flex-column"
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#1a1a1aff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      {/*fixed navbar so its aligned with everything*/}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "220px",   // keeps lined up with sidebar width
          right: 0,
          height: "60px",
          backgroundColor: "#000000ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 24px",
          zIndex: 300,
          borderBottom: "1px solid #000"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={minimize}
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "none",
              width: "24px",
              height: "24px",
              cursor: "pointer",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Minimize"
          >
            <FaMinus />
          </button>

          <button
            onClick={close}
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "none",
              width: "24px",
              height: "24px",
              cursor: "pointer",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Close"
          >
            <FaTimes />
          </button>
        </div>
      </div>
      <div style={{ height: 60 }} />

      {/* content for home will go here */}
      <div style={{ padding: "16px 24px" }}>
      </div>
    </Container>
  );
}

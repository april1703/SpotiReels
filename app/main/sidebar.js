import { FaHome, FaSearch, FaBook, FaPlus, FaFilm } from "react-icons/fa"

const Sidebar = () => {
    return (
        <div
            style={{
                position: "fixed",
                top: 70,
                left: 10,
                width: "200px",
                height: "76vh",
                backgroundColor: "#050505",
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: "20px",
                borderRight: "1px solid #050505",
                zIndex: 100
            }}
            >
            <h4 style={{ color: "#8e2dd2ff", marginBottom: "40px"}}>SpotiReelsTagram</h4>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    width: "100%"
                }}
                >
                    <button style={navButtonStyle}><FaHome />Home</button>
                    <button style={navButtonStyle}><FaSearch/>Search</button>
                    <button style={navButtonStyle}><FaBook/>Library</button>
                    <button style={navButtonStyle}><FaPlus/>Playlist</button>
                    <button style={navButtonStyle}><FaFilm />Reels</button>
                </div>
        </div>
    )
}

const navButtonStyle = {
    backgroundColor: "transparent",
    color: "white",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 20px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontSize: "16px"
};

export default Sidebar;

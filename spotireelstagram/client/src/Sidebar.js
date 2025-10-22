import { FaHome, FaSearch, FaBook, FaPlus, FaFilm, FaCog } from "react-icons/fa"

const Sidebar = ({ onOpenCreatePlaylist }) => {
    const go = (path) => () => { 
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };
    return (
        <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "220px",
                    height: "100vh",
                    backgroundColor: "#000000ff",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: "20px",
                    borderRight: "1px solid #000000ff",
                    zIndex: 100
                }}
                >
            <h4 style={{ color: "#8e2dd2ff", marginBottom: "40px"}}>SpotiReels</h4>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    width: "100%"
                }}
                >
                    <button style={navButtonStyle} onClick={go("/home")}><FaHome />Home</button>
                    <button style={navButtonStyle} onClick={go("/search")}><FaSearch/>Search</button>
                    <button style={navButtonStyle}><FaBook/>Library</button>
                    <button style={navButtonStyle} onClick={onOpenCreatePlaylist}><FaPlus/>New Playlist</button>
                    <button style={navButtonStyle}><FaFilm />Reels</button>
                    <button style={navButtonStyle} onClick={go("/settings")}><FaCog />Settings</button>
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


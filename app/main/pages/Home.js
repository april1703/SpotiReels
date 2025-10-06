import { Container } from 'react-bootstrap'
import { FaMinus, FaTimes } from "react-icons/fa"
import Sidebar from'../sidebar'
import useAuth from '../useAuth'
import Player from '../Player'

export default function Home({code}) {
    const accessToken = useAuth(code)

    const close = () => {window.close();};
    const minimize = () => {
        document.body.style.display = "none"; // add functionality 
};

    const logout = () => {window.location.href = "/";};

    return (
        
        <Container
        fluid
            className="d-flex flex-column py-2" 
            style={{ 
                width: "100%", 
                height: "100vh", 
                backgroundColor: "#1a1a1a",
                display: "flex",
                flexDirection: "row",
                overflow: "hidden"
                }}>

            <Sidebar />

            {/* Top navbar */}
            <div
                style = {{
                    width: "100%",
                    height: "50px",
                    backgroundColor: "#050505", 
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "10px 20px",
                    position: "sticky",
                    top: 0,
                    zIndex: 200
                }}
                >
                <div style={{display:"flex", alignItems:"center", gap: "15px"}}>
                        <button
                        onClick={minimize}
                        style={{
                            backgroundColor: "black",
                            color: "white",
                            border: "none",
                            width: "24px",
                            height: "24px",
                            cursor: "pointer",
                            fontSize: "18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"}}
                            title="Minimize"
                            >
                                <FaMinus/>
                            </button>
                    <button
                        onClick={close}
                        style={{backgroundColor: "black",
                            color: "white",
                            border: "none",
                            width: "24px",
                            height: "24px",
                            cursor: "pointer",
                            fontSize: "18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"}}
                        title="Close">
                            <FaTimes />
                    </button>
                    <button
                        onClick={logout}
                        style={{
                            backgroundColor: "#bf5028",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: "14px",
                        }}
                    >
                        Logout
                    </button>
                </div>
                </div>
                {/*future homescreen stuff like search results, playlists, etc. goes here*/}
                        
            {/* BOTTOM PLAYER */}
                
            <div className="flex-grow-1 my-2" style={{ 
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "10px 20px",
                zIndex: 200
                 }}>
                <Player accessToken= {accessToken} /> 
            
            </div>
        </Container>
    )
}

import { useEffect, useState} from 'react';

// Retrieve cookie - send username to backend
function getCookie(name) {
  let value = `; ${document.cookie}`;
  let parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

function getCurrentUser() {
  const token = getCookie("token");
  if (!token) return null;
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.username;
}

export default function FollowingPopup({isOpen, onClose}) {
    const currentUser = getCurrentUser();
    const [following, setFollowing] = useState([]);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (!isOpen || !currentUser) return;
        let cancelled = false;

        (async () => {
            setStatus("Loading...");
         
        try{
            const request = await fetch ("http://localhost:3001/getFollowing", {
                method: "POST",
                credentials: "omit",
                headers: {"Content-type": "application/json"},
                body: JSON.stringify({username: currentUser})
            });
            if (!request.ok) 
                throw new Error(`HTTP ${request.status}`);
            const data = await request.json();
            if (cancelled)
                return;

            setFollowing(data.following || []);
            setStatus("");
        }
        catch(e) {
            if(!cancelled)
                setStatus("Couldn't load following.");
        }
        })();
        return () => {cancelled = true};
    }, [isOpen, currentUser]);

    async function unfollowServer(followingUsername) {
    setStatus("Updating...");
    try{
        await fetch("http://localhost:3001/removeFollowing", {
            method: "POST",
            credentials: "omit",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({ username: currentUser, following_username: followingUsername }),
        });
        setFollowing(prev =>  prev.filter(u => u !== followingUsername));
        setStatus("");
    }   catch (e) {
        setStatus("Failed to unfollow");
    }
    
  }


    if(!isOpen)
        return null;

return(
    <div style={backdrop} onClick={onClose}>
        <div style={menu} onClick={(e) => e.stopPropagation()}>
            <div style={headerRow}>
                <strong>Following</strong>
                <button onClick={onClose} style={xBtn}>×</button>
            </div>
            {status && 
            <div style={statusStyle}>
                {status}
            </div>}
            <div style={listContainer}>
                {following.map((user, idx) => (
                    <div key={idx} style={row}>
                        <span>@{user}</span>
                        <button
                        onClick={() => unfollowServer(user)}
                        style={unfollowBtn}>Unfollow</button>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

}


// Styles for popup

const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 };
const menu = { width: "min(420px,92vw)", background: "#151515", color: "white", borderRadius: 12, padding: 12, border: "1px solid #2a2a2a", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8};
const xBtn = { background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer", lineHeight: 1 };
const statusStyle = {color: "#b3b3b3", marginBottom: 6};
const row = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "transparent", border: "1px solid #242424", borderRadius: 8, color: "inherit", cursor: "pointer" };
const listContainer = { maxHeight: 360, overflow: "auto", display: "grid", gap: 6};
const unfollowBtn = {background: "transparent", border: "1px solid #444", borderRadius: 8, padding: "4px 8px", color: "#ff4d4d", cursor: "pointer", fontSize: 12,}
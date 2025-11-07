import React, { useEffect, useState } from "react";
import "./createPlaylistPopup.css"

//popup appears when +  button on sidebar is clicked

export default function CreatePlaylistPopup({
  accessToken,
  isOpen,
  onClose
}) {
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // fetch current user's id once when opened
  useEffect(() => {
    if (!isOpen || !accessToken) return;
    (async () => {
      try {
        const r = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const me = await r.json();
        setUserId(me.id || "");
      } catch (e) {
        setMsg("Could not load user profile. Check login/scopes.");
      }
    })();
  }, [isOpen, accessToken]);


  async function handleCreate(e) {
    e.preventDefault();
    setMsg("");
    if (!accessToken) return setMsg("Please log in first.");
    if (!userId) return setMsg("Missing user id.");
    if (!name.trim()) return setMsg("Playlist name is required.");

    setBusy(true);
    try {
      // 1) Create the playlist
      const createRes = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description || "",
        }),
      });
      if (!createRes.ok) throw new Error(`Create failed: HTTP ${createRes.status}`);
      const playlist = await createRes.json();

      setMsg("Playlist created!");
      // quick reset then close
      setTimeout(() => {
        setName(""); 
        setDescription(""); 
        setBusy(false); 
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      setBusy(false);
      setMsg(err.message || "Something went wrong.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="backdropStyle" onClick={onClose}>
      <div className="modalStyle" onClick={(e) => e.stopPropagation()}>
        <div className="header">
          <h3 style={{ margin: 0 }}>Create Playlist</h3>
          <button onClick={onClose} className="popup-close">×</button>
        </div>

        <form onSubmit={handleCreate} className="form">
          <label>
            <div className="label">Name*</div>
            <input
              className="input"
              type="text"
              placeholder="My Playlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            <div className="label">Description</div>
            <input
              className="input"
              type="text"
              placeholder="Vibes, genre, purpose, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <button type="submit" disabled={busy} className="submitStyle">
            {busy ? "Creating…" : "Create"}
          </button>
          {msg && <div className="message">{msg}</div>}
          {!accessToken && <div className="error">Not logged in.</div>}
        </form>
      </div>
    </div>
  );
}
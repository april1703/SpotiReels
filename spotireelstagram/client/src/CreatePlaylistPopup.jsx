import React, { useEffect, useState } from "react";

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
        setName(""); setDescription(""); setBusy(false); onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      setBusy(false);
      setMsg(err.message || "Something went wrong.");
    }
  }

  if (!isOpen) return null;

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Create Playlist</h3>
          <button onClick={onClose} style={xBtnStyle}>×</button>
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label>
            <div style={labelStyle}>Name*</div>
            <input
              style={inputStyle}
              type="text"
              placeholder="My Playlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            <div style={labelStyle}>Description</div>
            <input
              style={inputStyle}
              type="text"
              placeholder="Vibes, genre, purpose, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <button type="submit" disabled={busy} style={submitStyle}>
            {busy ? "Creating…" : "Create"}
          </button>
          {msg && <div style={{ color: "#b3ffb3" }}>{msg}</div>}
          {!accessToken && <div style={{ color: "#ffb3b3" }}>Not logged in.</div>}
        </form>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  width: "min(560px, 92vw)",
  background: "#121212",
  color: "white",
  borderRadius: 12,
  padding: 18,
  border: "1px solid #2a2a2a",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1a1a1a",
  color: "white",
  outline: "none",
};

const labelStyle = { fontSize: 13, color: "#b3b3b3", marginBottom: 4 };

const submitStyle = {
  background: "#8e2dd2",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const xBtnStyle = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1,
};

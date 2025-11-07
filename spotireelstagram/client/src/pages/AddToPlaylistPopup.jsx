import React, { useEffect, useMemo, useState } from "react";

export default function AddToPlaylistPopup({ accessToken, trackUri, isOpen, onClose }) {
  const headers = useMemo(() => (
    accessToken ? { Authorization: `Bearer ${accessToken}` } : null
  ), [accessToken]);

  const [playlists, setPlaylists] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!isOpen || !headers) return;
    let cancelled = false;

    (async () => {
      setStatus("Loading…");
      const all = [];
      let url = "https://api.spotify.com/v1/me/playlists?limit=50";
      try {
        while (url) {
          const r = await fetch(url, { headers });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const data = await r.json();
          all.push(...(data.items || []));
          url = data.next;
          if (cancelled) return;
        }
        if (!cancelled) {
          setPlaylists(all.map(p => ({ id: p.id, name: p.name, img: p.images?.[2]?.url || p.images?.[1]?.url || p.images?.[0]?.url || "" })));
          setStatus("");
        }
      } catch (e) {
        if (!cancelled) setStatus("Couldn't load playlists.");
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, headers]);

  async function addTo(pid) {
    if (!headers || !trackUri) return;
    setStatus("Adding…");
    try {
      const r = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(pid)}/tracks`, {
        method: "POST",
        headers: { Authorization: headers.Authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [trackUri] })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setStatus("Added!");
      setTimeout(onClose, 600);
    } catch (e) {
      setStatus("Failed to add.");
    }
  }

  if (!isOpen) return null;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={menu} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong>Add to playlist</strong>
          <button onClick={onClose} style={xBtn}>×</button>
        </div>
        {status && <div style={{ color: "#b3b3b3", marginBottom: 6 }}>{status}</div>}
        <div style={{ maxHeight: 360, overflow: "auto", display: "grid", gap: 6 }}>
          {playlists.map(p => (
            <button key={p.id} onClick={() => addTo(p.id)} style={row}>
              {p.img ? <img alt="" src={p.img} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} /> : <div style={placeholder} />}
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 };
const menu = { width: "min(420px,92vw)", background: "#151515", color: "white", borderRadius: 12, padding: 12, border: "1px solid #2a2a2a", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" };
const xBtn = { background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer", lineHeight: 1 };
const row = { display: "grid", gridTemplateColumns: "28px 1fr", gap: 10, alignItems: "center", padding: 8, background: "transparent", border: "1px solid #242424", borderRadius: 8, color: "inherit", cursor: "pointer", textAlign: "left" };
const placeholder = { width: 28, height: 28, borderRadius: 6, background: "#222", border: "1px solid #333" };

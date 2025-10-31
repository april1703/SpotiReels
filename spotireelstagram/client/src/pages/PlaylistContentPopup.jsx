import React, { useEffect, useMemo, useState } from "react";

export default function PlaylistModal({ accessToken, playlistId, isOpen, onClose, onPlay }) {
  const headers = useMemo(() => (
    accessToken ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } : null
  ), [accessToken]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [meta, setMeta] = useState({ name: "", description: "", images: [] });
  const [tracks, setTracks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !headers || !playlistId) return;
    let cancelled = false;

    (async () => {
      setErr(""); setBusy(true);
      try {
        // fetch playlist details
        const url = new URL(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}`);
        url.searchParams.set("fields", "name,description,images,tracks(items(track(id,uri,name,artists(name),album(images))),next)");
        const r = await fetch(url, { headers: { Authorization: headers.Authorization } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();

        const t = [];
        for (const it of data.tracks?.items ?? []) {
          const tr = it.track;
          if (!tr) continue;
          t.push({
            id: tr.id,
            uri: tr.uri,
            title: tr.name,
            artists: (tr.artists ?? []).map(a => a.name).join(", "),
            img: tr.album?.images?.[2]?.url || tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url || "",
          });
        }

        if (!cancelled) {
          setMeta({ name: data.name || "", description: data.description || "", images: data.images || [] });
          setTracks(t);
        }
      } catch (e) {
        if (!cancelled) setErr("Couldn't load playlist. Check login/scopes.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, headers, playlistId]);

  async function saveMeta() {
    if (!headers) return;
    setSaving(true); setErr("");
    try {
      const r = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: meta.name || "", description: meta.description || "" })
      });
      if (!r.ok) throw new Error(`Save failed: HTTP ${r.status}`);
    } catch (e) {
      setErr(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const cover = meta.images?.[0]?.url;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Playlist</h3>
          <button onClick={onClose} style={xBtn}>×</button>
        </div>
        {(
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={coverBox}>
                  {cover ? <img alt="" src={cover} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <div style={{ color: "#aaa" }}>No Cover</div>}
                </div>
              </div>

              <div style={{ flex: 1, display: "grid", gap: 8 }}>
                <label>
                  <div style={label}>Name</div>
                  <input
                    style={input}
                    value={meta.name}
                    onChange={(e) => setMeta(m => ({ ...m, name: e.target.value }))}
                  />
                </label>
                <label>
                  <div style={label}>Description</div>
                  <textarea
                    style={{ ...input, height: 78, resize: "vertical" }}
                    value={meta.description}
                    onChange={(e) => setMeta(m => ({ ...m, description: e.target.value }))}
                  />
                </label>
                <button onClick={saveMeta} disabled={saving} style={primaryBtn}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <h4 style={{ margin: "12px 0" }}>Tracks</h4>
            <div style={{ maxHeight: "45vh", overflow: "auto", border: "1px solid #222", borderRadius: 8 }}>
              {tracks.length === 0 && <div style={{ padding: 12, color: "#b3b3b3" }}>No tracks.</div>}
              {tracks.map(t => (
                <button
                  key={t.id}
                  onClick={() => onPlay?.(t.uri)}
                  style={trackRow}
                  title="Play"
                >
                  <img alt="" src={t.img || ""} onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: "#222" }} />
                  <div style={{ display: "grid", textAlign: "left" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.1 }}>{t.title}</div>
                    <div style={{ color: "#bdbdbd", fontSize: 12 }}>{t.artists}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modal = { width: "min(820px, 92vw)", background: "#121212", color: "white", borderRadius: 12, padding: 18, border: "1px solid #2a2a2a", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" };
const xBtn = { background: "transparent", border: "none", color: "white", fontSize: 24, cursor: "pointer", lineHeight: 1 };

const input = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#1a1a1a", color: "white", outline: "none" };
const label = { fontSize: 13, color: "#b3b3b3", marginBottom: 4 };
const primaryBtn = { background: "#8e2dd2", color: "white", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600 };

const coverBox = { width: 180, height: 180, borderRadius: 8, overflow: "hidden", display: "grid", placeItems: "center", background: "#0f0f10", border: "1px solid #222" };

const trackRow = { width: "100%", display: "grid", gridTemplateColumns: "40px 1fr", gap: 12, alignItems: "center", padding: 10, background: "transparent", border: "none", borderBottom: "1px solid #1e1e1e", color: "inherit", cursor: "pointer", textAlign: "left" };

// src/pages/LikedSongs.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./Search.css";

/* ---------- tiny helpers ---------- */
function readRefreshToken() {
  try { return window.localStorage.getItem("refreshToken") || ""; }
  catch { return ""; }
}

async function fetchLikedPage({ offset = 0, limit = 30 }) {
  const refreshToken = readRefreshToken();
  const res = await fetch("http://127.0.0.1:3001/spotify/liked", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, offset, limit }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json(); // { items:[{id,name,artists[],image}], total, nextOffset }
}

async function unlikeOnServer(trackId) {
  const refreshToken = readRefreshToken();
  const r = await fetch("http://127.0.0.1:3001/spotify/unlike", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, trackId }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
}

/* ---------- small heart button (pure CSS/SVG; matches Search.css look) ---------- */
function LikeButton({ checked, onChange, size = 22, color = "rgb(189, 91, 255)" }) {
  return (
    <button
      type="button"
      aria-label={checked ? "Unlike" : "Like"}
      onClick={(e) => { e.stopPropagation(); onChange?.(!checked); }}
      style={{
        width: size, height: size, border: "none", background: "transparent",
        display: "grid", placeItems: "center", cursor: "pointer", padding: 0
      }}
    >
      {/* outline */}
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12.1 8.64l-.1.1-.11-.11C9.14 5.9 5.1 6.24 3.28 8.99c-1.6 2.38-.52 5.54 2.17 6.97L12 21l6.55-5.04c2.69-1.43 3.77-4.59 2.17-6.97-1.82-2.75-5.86-3.1-8.62-.35z"
          fill={checked ? color : "none"}
          stroke="white"
          strokeWidth="1.75"
        />
      </svg>
    </button>
  );
}

/* ---------- page ---------- */
export default function LikedSongs() {
  const [items, setItems] = useState([]);        // [{id,name,artists[],image}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(null);

  const canLoadMore = useMemo(() => {
    if (total == null) return true;
    return items.length < total;
  }, [items.length, total]);

  const loadPage = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { items: page, total: t, nextOffset } = await fetchLikedPage({ offset, limit: 30 });
      setItems(prev => [...prev, ...page]);
      if (typeof t === "number") setTotal(t);
      setOffset(nextOffset ?? (offset + page.length));
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load liked songs");
    } finally {
      setLoading(false);
    }
  }, [offset, loading]);

  useEffect(() => { loadPage(); }, []); // initial load

  const likedSet = useMemo(() => new Set(items.map(i => i.id)), [items]);

  const handleUnlike = async (trackId) => {
    // optimistic: remove from UI immediately
    setItems(prev => prev.filter(x => x.id !== trackId));
    try {
      await unlikeOnServer(trackId);
    } catch (e) {
      // rollback on failure
      setError("Couldn't remove from Liked Songs. Re-auth with 'user-library-modify' and try again.");
      console.error(e);
      // (optional) re-fetch the current page to restore
      setOffset(0); setItems([]); setTotal(null); loadPage();
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Liked Songs</h1>

      {error && <div className="banner-error">{error}</div>}

      <div className="results-grid">
        {items.map((it) => (
          <div key={it.id} className="card">
            <div className="card-left">
              <img src={it.image} alt={it.name} className="cover" />
            </div>

            <div className="card-body">
              <div className="pill">Track</div>

              <div className="title">{it.name}</div>
              <div className="subtitle">
                {Array.isArray(it.artists) ? it.artists.join(", ") : it.artists}
              </div>
            </div>

            {/* heart in the top-right of the card */}
            <div style={{ position: "absolute", top: 8, right: 8 }}>
              <LikeButton
                checked={likedSet.has(it.id)}
                size={24}
                color="rgb(189, 91, 255)"
                onChange={(next) => {
                  if (!next) handleUnlike(it.id);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {canLoadMore ? (
          <button className="secondary-btn" disabled={loading} onClick={loadPage}>
            {loading ? "Loading..." : "Load more"}
          </button>
        ) : (
          <div className="dim">You're all caught up.</div>
        )}
      </div>
    </div>
  );
}

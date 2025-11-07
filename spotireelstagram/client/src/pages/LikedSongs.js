import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./Search.css";

function readRefreshToken() {
  try { return window.localStorage.getItem("refreshToken") || ""; }
  catch { return ""; }
}

async function fetchLikedPage({ offset = 0, limit = 50 }) {
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
  return res.json();
}

async function unlikeOnServer(trackId) {
  const refreshToken = readRefreshToken();
  const res = await fetch("http://127.0.0.1:3001/spotify/unlike", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, trackId }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${res.status}`);
  }
}

function LikeButton({ checked, onChange, size = 18, color = "rgb(189, 91, 255)" }) {
  return (
    <button
      type="button"
      aria-label={checked ? "Unlike" : "Like"}
      onClick={(e) => { e.stopPropagation(); onChange?.(!checked); }}
      style={{
        width: size, 
        height: size, 
        border: "none", 
        background: "transparent",
        cursor: "pointer"
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12.1 8.64l-.1.1-.11-.11C9.14 5.9 5.1 6.24 3.28 8.99c-1.6 2.38-.52 5.54 2.17 6.97L12 21l6.55-5.04c2.69-1.43 3.77-4.59 2.17-6.97-1.82-2.75-5.86-3.1-8.62-.35z"
          fill={checked ? color : "none"}
          stroke="white"
          strokeWidth="1.6"
        />
      </svg>
    </button>
  );
}

export default function LikedSongs({ setTrackUri }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(null);

  const loadPage = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { items: page, total: t, nextOffset } = await fetchLikedPage({ offset, limit: 50 });
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

  useEffect(() => { loadPage(); }, []);

  const canLoadMore = useMemo(
    () => total == null || items.length < total,
    [items.length, total]
  );

  const likedSet = useMemo(() => new Set(items.map(i => i.id)), [items]);

  const handleUnlike = async (trackId) => {
    setItems(prev => prev.filter(x => x.id !== trackId));
    try {
      await unlikeOnServer(trackId);
    } catch (e) {
      console.error(e);
      setError("Couldn't remove from Liked Songs. Re-auth with 'user-library-modify' and try again.");
    }
  };

  const onCardClick = (track) => {
    if (setTrackUri) {
      setTrackUri(`spotify:track:${track.id}`);
      return
    }

    const preview = track.preview || track.preview_url || null;
    if (!preview) {
      setError("No 30s preview is available for this track.");
      return;
    }

    window.dispatchEvent(
      new CustomEvent("player:play", {
        detail: {
          id: track.id,
          title: track.name,
          artist: Array.isArray(track.artists) ? track.artists.join(", ") : track.artists,
          image: track.image || track.images,
          previewUrl: preview,
        },
      })
    );
  };

  return (
    <div className="page">
      <h1 className="page-title" style={{color:"#8e2dd2ff"}}>Liked Songs</h1>

      {error && <div className="banner-error">{error}</div>}

      <div className="results-grid grid-compact">
        {items.map((it) => (
          <div
            key={it.id}
            className="card card-compact"
            role="button"
            tabIndex={0}
            onClick={() => onCardClick(it)}
            onKeyDown={(e) => (e.key === "enter" || e.key === " ") && onCardClick(it)}
            title="Play preview"
          >
            <div className="card-left">
              <img src={it.image} alt={it.name} className="cover cover--sm" />
            </div>

            <div className="card-body">
              <div className="title">
                {it.name || it.title || it.track?.name}
              </div>

              <div className="subtitle subtitle--sm">
                {Array.isArray(it.artists) ? it.artists.join(", ") : it.artists}
              </div>
            </div>

            <div style={{ position: "absolute", top: 6, right: 6 }}>
              <LikeButton
                checked={likedSet.has(it.id)}
                onChange={(next) => { if (!next) handleUnlike(it.id); }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {canLoadMore ? (
          <button className="secondary-btn" style = {{
            backgroundColor: "#8e2dd2ff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "14px"
          }} 
          disabled={loading} onClick={loadPage}>
            {loading ? "Loading..." : "Load more"}
          </button>
        ) : (
          <div className="dim">You're all caught up.</div>
        )}
      </div>
    </div>
  );
}

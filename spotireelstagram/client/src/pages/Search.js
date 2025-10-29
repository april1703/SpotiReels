import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Search.css";

// SEARCH PAGE EXPLANATION
// allows searching for tracks, artists, albums
// uses Spotify Web API to fetch results
// when a track is clicked, it calls setTrackUri and updates trackURI to the track chosen
// that trackURI is stored in App.js and passed to Player.js to play the selected track

function readStoredToken() {
  return window.localStorage.getItem('accessToken') || ''
}

function LikeButton({ checked, onChange, size = 26, color = "rgb(189, 91, 255)" }) {
  const [local, setLocal] = React.useState(!!checked);
  React.useEffect(() => setLocal(!!checked), [checked]);

  const toggle = (ev) => {
    ev.preventDefault?.();
    ev.stopPropagation?.();
    if (ev?.nativeEvent?.stopImmediatePropagation) ev.nativeEvent.stopImmediatePropagation();

    const next = !local;
    setLocal(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      className={`heart-container${local ? " liked" : ""}`}
      onClick={toggle}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      aria-pressed={local}
      title={local ? "Unlike" : "Like"}
      style={{ "--heart-color": color, "--heart-size": `${size}px` }}
    >
      <span className="svg-container" aria-hidden>
        <svg className="svg-outline" viewBox="0 0 24 24" width={size} height={size}>
          <path d="M12.1 8.64l-.1.1-.1-.1C10.14 6.82 7.1 6.9 5.36 8.64c-1.78 1.78-1.78 4.66 0 6.44L12 21.72l6.64-6.64c1.78-1.78 1.78-4.66 0-6.44-1.74-1.74-4.78-1.82-6.54-.01z" />
        </svg>

        <svg className="svg-filled" viewBox="0 0 21 21" width={size} height={size}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        <svg className="svg-celebrate" viewBox="0 0 24 24" width={size} height={size}>
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="20" cy="6" r="1.5" />
          <circle cx="18" cy="20" r="1.2" />
          <circle cx="6" cy="19" r="1.2" />
        </svg>
      </span>
    </button>
  );
}

export default function Search({ accessToken: propAccessToken, setTrackUri }) {
  const [accessToken, setAccessToken] = useState(() => propAccessToken || readStoredToken());
  const [q, setQ] = useState("");
  const [type, setType] = useState("track,artist,album");
  const [market, setMarket] = useState("US");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [liked, setLiked] = useState(() => new Set());
  const timer = useRef(null);

  useEffect(() => {
    if (propAccessToken && propAccessToken !== accessToken) {
      setAccessToken(propAccessToken);
      try { window.localStorage.setItem('accessToken', propAccessToken) } catch (e) {}
      return;
    }

    const t = readStoredToken();
    if (t && t !== accessToken) setAccessToken(t);
  }, [propAccessToken]);

  const debounce = (fn, ms = 350) => (...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), ms);
  };
  const debouncedSearch = useMemo(() => debounce(runSearch, 350), [accessToken, type, market]);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  async function runSearch(nextQ = q) {
    const query = nextQ.trim();
    setStatus(query ? "Searching..." : "");
    setItems([]);
    if (!query) return;

    if (!accessToken) {
      setStatus("Please log in first.");
      return;
    }

    try {
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", query);
      url.searchParams.set("type", type);
      url.searchParams.set("limit", "12");
      if (market) url.searchParams.set("market", market);

      let r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (r.status === 401) {
        const updated = readStoredToken();
        if (updated && updated !== accessToken) {
          setAccessToken(updated);
          r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${updated}` } });
        }
      }

      if (r.status === 429) {
        const retry = r.headers.get("Retry-After") || "1";
        setStatus(`Rate limited. Try again in ${retry} seconds.`);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const data = await r.json();
      const list = [];

      for (const t of (data.tracks?.items ?? [])) {
        const img = t.album?.images?.[2]?.url || t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "";
        const artists = (t.artists ?? []).map(a => a.name).join(", ");
        list.push({
          key: `track:${t.id}`,
          pill: "Track",
          img, title: t.name, subtitle: artists,
          uri: `spotify:track:${t.id}`,
          href: `https://open.spotify.com/track/${t.id}`
        });
      }

      for (const a of (data.artists?.items ?? [])) {
        const img = a.images?.[2]?.url || a.images?.[1]?.url || a.images?.[0]?.url || "";
        list.push({
          key: `artist:${a.id}`,
          pill: "Artist",
          img, title: a.name,
          subtitle: `${Intl.NumberFormat().format(a.followers?.total ?? 0)} followers`,
          href: `https://open.spotify.com/artist/${a.id}`
        });
      }

      for (const al of (data.albums?.items ?? [])) {
        const img = al.images?.[2]?.url || al.images?.[1]?.url || al.images?.[0]?.url || "";
        const artists = (al.artists ?? []).map(x => x.name).join(", ");
        list.push({
          key: `album:${al.id}`,
          pill: "Album",
          img, title: al.name,
          subtitle: `${artists} • ${al.release_date ?? ""}`,
          href: `https://open.spotify.com/album/${al.id}`
        });
      }

      setItems(list);
      setStatus("");
    } catch (e) {
      console.error(e);
      setStatus("Error fetching results.");
    }
  }

  const toggleLike = (key) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="search-page">
      <h2>Spotify Search</h2>

      <div className="search-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search tracks, artists, albums..."
          value={q}
          onChange={(e) => { const val = e.target.value; setQ(val); debouncedSearch(val); }}
        />
        <select className="search-select" value={type} onChange={(e) => { setType(e.target.value); runSearch(); }}>
          <option value="track,artist,album">All</option>
          <option value="track">Tracks</option>
          <option value="artist">Artists</option>
          <option value="album">Albums</option>
        </select>

        <select className="search-select" value={market} onChange={(e) => { setMarket(e.target.value); runSearch(); }}>
          <option value="US">US</option>
          <option value="GB">GB</option>
          <option value="DE">DE</option>
          <option value="CA">CA</option>
          <option value="">Any</option>
        </select>

        <button className="search-button" onClick={() => runSearch()}>Search</button>
        <span className="search-status">{status}</span>
      </div>

      {!accessToken && (
        <div className="search-status" style={{ marginBottom: 8 }}>
            Not logged in - use the app's login first, then come back here.
        </div>
      )}

      <div className="search-grid">
        {items.length === 0 && status === "" && q && <div style={{ color: "#bbb"}}>No results.</div>}

        {items.map(({ key, pill, img, title, subtitle, href, uri }) => (
          <div
            key={key}
            className="result-card"
            onClick={() => { if (uri && setTrackUri) setTrackUri(uri); }}
            style={{ cursor: uri ? "pointer" : "auto" }}
          >
            <div className="result-card__like">
              <LikeButton
                checked={liked.has(key)}
                onChange={() => toggleLike(key)}
                size={24}
                color="rgb(189, 91, 255)"
              />
            </div>

            {img ? (
              <img
                alt=""
                src={img}
                className="result-card__img"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            <div className="result-card__meta">
              <span className="result-card__pill">{pill}</span>
              <div className="result-card__title" dangerouslySetInnerHTML={{__html: escapeHtml(title) }} />
              <div className="result-card__subtitle" dangerouslySetInnerHTML={{__html: escapeHtml(subtitle || "") }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

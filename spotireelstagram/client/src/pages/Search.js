import React, { useEffect, useMemo, useRef, useState } from "react";

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

  const css = React.useMemo(
    () => `
    .heart-container {
      --heart-color: ${color};
      position: relative;
      width: ${size}px;
      height: ${size}px;
      transition: .3s;
      display: inline-flex;
    }
    .heart-container .svg-container {
      width: 100%; height: 100%;
      display: flex; justify-content: center; align-items: center;
      position: relative;
    }
    .heart-container .svg-outline,
    .heart-container .svg-filled {
      position: absolute;
      fill: var(--heart-color);
    }
    .heart-container .svg-outline path { fill: none; stroke: currentColor; stroke-width: 1.7 }
    .heart-container .svg-filled { display: none; animation: keyframes-svg-filled 1s; }
    .heart-container .svg-celebrate {
      position: absolute; display: none;
      stroke: var(--heart-color); fill: var(--heart-color); stroke-width: 2px;
      animation: keyframes-svg-celebrate .5s forwards;
    }
    /* React-driven state */
    .heart-container.liked .svg-filled { display: block; }
    .heart-container.liked .svg-celebrate { display: block; }

    @keyframes keyframes-svg-filled {
      0% { transform: scale(0) }
      25% { transform: scale(1.2) }
      50% { transform: scale(1); filter: brightness(1.5) }
    }
    @keyframes keyframes-svg-celebrate {
      0% { transform: scale(0) }
      50% { opacity: 1; filter: brightness(1.5) }
      100% { transform: scale(1.4); opacity: 0; display: none }
    }`,
    [size, color]
  );

  const toggle = (ev) => {
    // keep the card from receiving this click
    ev.preventDefault?.();
    ev.stopPropagation?.();
    if (ev?.nativeEvent?.stopImmediatePropagation) ev.nativeEvent.stopImmediatePropagation();

    const next = !local;
    setLocal(next);
    onChange?.(next);
  };

  return (
    <>
      <style>{css}</style>
      <button
        type="button"
        className={`heart-container${local ? " liked" : ""}`}
        onClick={toggle}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        aria-pressed={local}
        title={local ? "Unlike" : "Like"}
        style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
      >
        <span className="svg-container" aria-hidden>
          <svg className="svg-outline" viewBox="0 0 24 24" width={size} height={size}>
            <path 
              d="M12.1 8.64l-.1.1-.1-.1C10.14 6.82 7.1 6.9 5.36 8.64c-1.78 1.78-1.78 4.66 0 6.44L12 21.72l6.64-6.64c1.78-1.78 1.78-4.66 0-6.44-1.74-1.74-4.78-1.82-6.54-.01z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          
          <svg className="svg-filled" viewBox="0 0 24 24" width={size} height={size}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>

          <svg className="svg-celebrate" viewBox="0 0 24 24" width={size} height={size}>
            <circle cx="4" cy="4" r="1.5"/><circle cx="20" cy="6" r="1.5"/>
            <circle cx="18" cy="20" r="1.2"/><circle cx="6" cy="19" r="1.2"/>
          </svg>
        </span>
      </button>
    </>
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
    <div style={{ padding: 16 }}>
      <h2>Spotify Search</h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 10, fontSize: 16 }}
          type="search"
          placeholder="Search tracks, artists, albums..."
          value={q}
          onChange={(e) => { const val = e.target.value; setQ(val); debouncedSearch(val); }}
        />
        <select value={type} onChange={(e) => { setType(e.target.value); runSearch(); }}>
          <option value="track,artist,album">All</option>
          <option value="track">Tracks</option>
          <option value="artist">Artists</option>
          <option value="album">Albums</option>
        </select>
        <select value={market} onChange={(e) => { setMarket(e.target.value); runSearch(); }}>
          <option value="US">US</option>
          <option value="GB">GB</option>
          <option value="DE">DE</option>
          <option value="CA">CA</option>
          <option value="">Any</option>
        </select>
        <button onClick={() => runSearch()}>Search</button>
        <span style={{ color: "#000000ff" }}>{status}</span>
      </div>

      {!accessToken && (
        <div style={{ marginBottom: 8, color: "rgba(0, 0, 0, 1)" }}>
            Not logged in - use the app's login first, then come back here.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12
        }}
      >
        {items.length === 0 && status === "" && q && <div style={{ color: "#bbb"}}>No results.</div>}
        {items.map(({ key, pill, img, title, subtitle, href, uri }) => (
          <div
            key={key}
            onClick={() => { if (uri && setTrackUri) setTrackUri(uri); }}
            style={{
              position: "relative",
              border: "1px solid #333",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              gap: 12,
              textDecoration: "none",
              color: "inherit",
              cursor: uri ? "pointer" : "auto",
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ position: "absolute", top: 8, right: 8 }}>
              <LikeButton
                checked={liked.has(key)}
                onChange={() => toggleLike(key)}
                size={24}
                color="rgb(189, 91, 255)"
              />
            </div>

            <img
              alt=""
              src={img || ""}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", background: "#222" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "inline-block", padding: "2px 8px", fontSize: 12, borderRadius: 999, border: "1px solid #444" }}>{pill}</span>
              <div style={{ fontWeight: 600, lineHeight: 1.2 }} dangerouslySetInnerHTML={{__html: escapeHtml(title) }} />
              <div style={{ color: "#ffffffff", fontSize: 13 }} dangerouslySetInnerHTML={{__html: escapeHtml(subtitle || "") }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

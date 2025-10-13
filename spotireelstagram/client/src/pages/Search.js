import React, { useEffect, useMemo, useRef, useState } from "react";

// SEARCH PAGE EXPLANATION
// allows searching for tracks, artists, albums
// uses Spotify Web API to fetch results
// when a track is clicked, it calls setTrackUri and updates trackURI to the track chosen
// that trackURI is stored in App.js and passed to Player.js to play the selected track

function readStoredToken() {
  return window.localStorage.getItem('accessToken') || ''
}

export default function Search({ accessToken: propAccessToken, setTrackUri }) {
  const [accessToken, setAccessToken] = useState(() => propAccessToken || readStoredToken());

  const [q, setQ] = useState("");
  const [type, setType] = useState("track,artist,album");
  const [market, setMarket] = useState("US");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
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
        {items.length === 0 && status === "" && q && (
          <div style={{ color: "#ffffffff" }}>No results.</div>
        )}
        {items.map(({ key, pill, img, title, subtitle, href, uri }) => (
          <div
            key={key}
            onClick={() => { if (uri && setTrackUri) setTrackUri(uri); }}
            style={{
              border: "1px solid #ffffffff", borderRadius: 12, padding: 12,
              display: "flex", gap: 12, textDecoration: "none", color: "inherit", cursor: uri ? 'pointer' : 'auto'
            }}
          >
            <img
              alt=""
              src={img || ""}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", background: "#ffffffff" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "inline-block", padding: "2px 8px", fontSize: 12, borderRadius: 999, border: "1px solid #ffffffff" }}>{pill}</span>
              <div style={{ fontWeight: 600, lineHeight: 1.2 }} dangerouslySetInnerHTML={{__html: escapeHtml(title) }} />
              <div style={{ color: "#ffffffff", fontSize: 13 }} dangerouslySetInnerHTML={{__html: escapeHtml(subtitle || "") }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

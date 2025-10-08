import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaHome, FaSearch, FaBook, FaPlus, FaFilm } from "react-icons/fa";

const TOKEN_KEYS = ["accessToken", "sr_accessToken", "spotifyAccessToken", "dev_spotify_token"];
const DEV_TOKEN_URL = 'http://localhost:5051/api/dev-token';

const navButtonStyle = {
    backgroundColor: "transparent",
    color: "white",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 20px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontSize: "16px"
};

const go = (path) => () => { window.location.pathname = path; };

function readStoredToken() {
  for (const k of TOKEN_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v) return v;
  }
  return "";
  
}

function readUrlToken() {
  return new URLSearchParams(window.location.search).get("token") || "";
}

export default function Search() {
  const [accessToken, setAccessToken] = useState(() => readUrlToken() || readStoredToken());

  const [q, setQ] = useState("");
  const [type, setType] = useState("track,artist,album");
  const [market, setMarket] = useState("US");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    const urlToken = readUrlToken();
    if (urlToken) {
      localStorage.setItem('dev_spotify_token', urlToken);
      setAccessToken(urlToken);

      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname + url.hash);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const t = readStoredToken();
      if (t && t !== accessToken) {
        setAccessToken(t);
        return;
      }

      try {
        const r = await fetch(DEV_TOKEN_URL);
        if (r.ok) {
          const j = await r.json();
          if (j?.access_token) {
            localStorage.setItem('dev_spotify_token', j.access_token);
            setAccessToken(j.access_token);
          }
        }
      } catch (err) {
        console.warn('Dev token fetch failed: ', err);
      }
    })();
  },[]);

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
      <button style={navButtonStyle} onClick={go("/Home")}><FaHome />Home</button>

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
        <span style={{ color: "#777" }}>{status}</span>
      </div>

      {!accessToken && (
        <div style={{ marginBottom: 8, color: "#b00" }}>
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
          <div style={{ color: "#777" }}>No results.</div>
        )}
        {items.map(({ key, pill, img, title, subtitle, href }) => (
          <a
            key={key}
            href={href}
            target="_blank" rel="noopener noreferrer"
            style={{
              border: "1px solid #e5e5e5", borderRadius: 12, padding: 12,
              display: "flex", gap: 12, textDecoration: "none", color: "inherit"
            }}
          >
            <img
              alt=""
              src={img || ""}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", background: "#f3f3f3" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "inline-block", padding: "2px 8px", fontSize: 12, borderRadius: 999, border: "1px solid #ccc" }}>{pill}</span>
              <div style={{ fontWeight: 600, lineHeight: 1.2 }} dangerouslySetInnerHTML={{__html: escapeHtml(title) }} />
              <div style={{ color: "#555", fontSize: 13 }} dangerouslySetInnerHTML={{__html: escapeHtml(subtitle || "") }} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
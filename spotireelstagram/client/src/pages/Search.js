import React, { useEffect, useMemo, useRef, useState } from "react";
import AddToPlaylistMenu from "./AddToPlaylistPopup";
import "./Search.css";

const SPOTIFY_ALLOWED = new Set(["track", "artist", "album", "playlist", "show", "episode"]);
function spotifyTypeString(typeStr) {
  const parts = (typeStr || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => SPOTIFY_ALLOWED.has(t));
  return [...new Set(parts)].join(",");
}

// Retrieve cookie - send username to backend
function getCookie(name) {
  let value = `; ${document.cookie}`;
  let parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

function getCurrentUser() {
  const token = getCookie("token");
  if (!token) return null;
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.username;
}

function readStoredToken() {
  return window.localStorage.getItem("accessToken") || "";
}
function readRefreshToken() {
  try {
    return window.localStorage.getItem("refreshToken") || "";
  } catch {
    return "";
  }
}

/* ====== Likes to your backend ====== */
async function likeOnServer(trackId) {
  const refreshToken = readRefreshToken();
  const r = await fetch("http://127.0.0.1:3001/spotify/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, trackId }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
}
async function unLikeOnServer(trackId) {
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

/* ===== Heart button ===== */
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
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
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
  const [users, setUsers] = useState([]); // all users in the system
  const [q, setQ] = useState("");
  // Keep users in the default so “All + Friends” works on first load
  const [type, setType] = useState("track,artist,album,users");
  const [market, setMarket] = useState("US");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [liked, setLiked] = useState(() => new Set());
  const [followed, setFollowed] = useState(new Set()); // who you follow
  const timer = useRef(null);
  const currentUser = useMemo(getCurrentUser, []);

  // Add-to-playlist picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTrackUri, setPickerTrackUri] = useState("");

  useEffect(() => {
    if(!currentUser) return;

    fetch("http://localhost:3001/getFollowing", {
      method: "POST",
      headers: {"Content-type": "application/json"},
      body: JSON.stringify({username: currentUser}),
    })

    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.warn("No following found:", text);
        setFollowed(new Set());
        return;
      }
      const data = await res.json();
      console.log("Fetched following from backend:", data)
      if (data.following) 
        setFollowed(new Set(data.following));
    })
    .catch(err => console.error("Error fetching following list:", err))
  }, [currentUser]);

  useEffect(() => {
    if (propAccessToken && propAccessToken !== accessToken) {
      setAccessToken(propAccessToken);
      try {
        window.localStorage.setItem("accessToken", propAccessToken);
      } catch (e) {}
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
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function runSearch(nextQ = q) {
    const query = nextQ.trim();
    setStatus(query ? "Searching..." : "");
    setItems([]);
    if (!query) return;

    const allTypes = (type || "").split(",").map((t) => t.trim()).filter(Boolean);
    const wantsUsers = allTypes.includes("users");
    const spotifyTypes = spotifyTypeString(type); // drops “users” automatically

    // Build both requests (whichever is applicable)
    const tasks = [];

    // Spotify request (tracks/artists/albums...)
    if (spotifyTypes) {
      if (!accessToken) {
        setStatus("Please log in first.");
        return;
      }
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", query);
      url.searchParams.set("type", spotifyTypes);
      url.searchParams.set("limit", "12");
      if (market) url.searchParams.set("market", market);

      tasks.push(
        (async () => {
          let r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
          if (r.status === 401) {
            const updated = readStoredToken();
            if (updated && updated !== accessToken) {
              setAccessToken(updated);
              r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${updated}` } });
            }
          }
          if (r.status === 429) {
            const retry = r.headers.get("Retry-After") || "1";
            throw new Error(`Rate limited. Try again in ${retry}s.`);
          }
          if (!r.ok) {
            let msg = `HTTP ${r.status}`;
            try {
              const j = await r.json();
              if (j?.error?.message) msg += ` – ${j.error.message}`;
            } catch {}
            throw new Error(msg);
          }

          const data = await r.json();
          const list = [];

          for (const t of data.tracks?.items ?? []) {
            const img =
              t.album?.images?.[2]?.url || t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "";
            const artists = (t.artists ?? []).map((a) => a.name).join(", ");
            list.push({
              key: `track:${t.id}`,
              pill: "Track",
              img,
              title: t.name,
              subtitle: artists,
              uri: `spotify:track:${t.id}`,
              href: `https://open.spotify.com/track/${t.id}`,
            });
          }

          for (const a of data.artists?.items ?? []) {
            const img = a.images?.[2]?.url || a.images?.[1]?.url || a.images?.[0]?.url || "";
            list.push({
              key: `artist:${a.id}`,
              pill: "Artist",
              img,
              title: a.name,
              subtitle: `${Intl.NumberFormat().format(a.followers?.total ?? 0)} followers`,
              href: `https://open.spotify.com/artist/${a.id}`,
            });
          }

          for (const al of data.albums?.items ?? []) {
            const img = al.images?.[2]?.url || al.images?.[1]?.url || al.images?.[0]?.url || "";
            const artists = (al.artists ?? []).map((x) => x.name).join(", ");
            list.push({
              key: `album:${al.id}`,
              pill: "Album",
              img,
              title: al.name,
              subtitle: `${artists} • ${al.release_date ?? ""}`,
              href: `https://open.spotify.com/album/${al.id}`,
            });
          }

          return list;
        })()
      );
    }

    // Users request to your backend
    if (wantsUsers) {
      tasks.push(
        (async () => {
          const res = await fetch("http://localhost:3001/searchUsers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          });
          if (res.status === 404) return []; // none found
          if (!res.ok) {
            // swallow but report in status later
            const msg = await res.text();
            throw new Error(msg || "User search failed");
          }
          const data = await res.json(); // [{username, display_name, avatarUrl?}]
          return data.map((user) => ({
            key: `user:${user.username}`,
            pill: "User",
            img: user.avatarUrl || "",
            title: user.display_name || user.username,
            subtitle: `@${user.username}`,
          }));
        })()
      );
    }

    try {
      const results = await Promise.allSettled(tasks);
      const merged = [];
      let hadError = false;

      for (const r of results) {
        if (r.status === "fulfilled") merged.push(...(r.value || []));
        else hadError = true;
      }

      setItems(merged);
      setStatus(merged.length ? (hadError ? "Some results failed to load." : "") : "No results.");
    } catch (e) {
      console.error(e);
      setStatus(e?.message || "Error fetching results.");
    }
  }

  function openAdd(trackUri) {
    setPickerTrackUri(trackUri);
    setPickerOpen(true);
  }

  async function followServer(followingUsername) {
    await fetch("http://localhost:3001/addFollowing", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-type": "application/json" },
      // server expects `following_username`
      body: JSON.stringify({ username: currentUser, following_username: followingUsername }),
    });
  }
  async function unfollowServer(followingUsername) {
    await fetch("http://localhost:3001/removeFollowing", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username: currentUser, following_username: followingUsername }),
    });
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: "#8e2dd2ff" }}>Spotify Search</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <input
          style={{ flex: 1, padding: 10, fontSize: 16 }}
          type="search"
          placeholder="Search tracks, artists, albums, friends…"
          value={q}
          onChange={(e) => {
            const val = e.target.value;
            setQ(val);
            debouncedSearch(val);
          }}
        />

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setStatus("");
            runSearch();
          }}
        >
          <option value="track,artist,album">All</option>
          <option value="track">Tracks</option>
          <option value="artist">Artists</option>
          <option value="album">Albums</option>
          <option value="users">Friends</option>
          <option value="track,artist,album,users">All + Friends</option>
        </select>

        <select
          value={market}
          onChange={(e) => {
            setMarket(e.target.value);
            runSearch();
          }}
        >
          <option value="US">US</option>
          <option value="GB">GB</option>
          <option value="DE">DE</option>
          <option value="CA">CA</option>
          <option value="">Any</option>
        </select>

        <button
          type="submit"
          style={{
            backgroundColor: "#8e2dd2ff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "14px",
          }}
          onClick={() => runSearch()}
        >
          Search
        </button>

        <span style={{ color: "var(--text)" }}>{status}</span>
      </div>

      {!accessToken && (
        <div style={{ marginBottom: 8, color: "var(--text)" }}>
          Not logged in — use the app’s login first, then come back here.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {items.length === 0 && status === "" && q && (
          <div style={{ color: "#bbb" }}>No results.</div>
        )}

        {items.map(({ key, pill, img, title, subtitle, uri }) => (
          <div
            key={key}
            onClick={() => {
              if (uri && setTrackUri) setTrackUri(uri);
            }}
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
            {/* Top-right actions */}
            <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
              {pill === "Track" && (
                <LikeButton
                  checked={false}
                  onChange={async (next) => {
                    try {
                      const trackId = key.split(":")[1];
                      if (next) await likeOnServer(trackId);
                      else await unLikeOnServer(trackId);
                    } catch (e) {
                      console.error("like toggle failed", e);
                    }
                  }}
                  size={24}
                  color="rgb(189, 91, 255)"
                />
              )}

              {uri && (
                <button
                  title="Add to playlist"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAdd(uri);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid #444",
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: "#8e2dd2ff",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  + Add
                </button>
              )}

              {pill === "User" && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const username = key.split(":")[1];
                    
                    // check to see if already following
                    const isCurrentlyFollowing = followed.has(username)

                    setFollowed((prev) => {
                      const toggle = new Set(prev);
                      if (isCurrentlyFollowing) 
                        toggle.delete(username); 
                      else 
                        {toggle.add(username)};
                      return toggle;
                    });

                    try {
                      if (isCurrentlyFollowing) 
                        await unfollowServer(username);
                      else 
                        await followServer(username);
                    } catch (err) {
                      console.error("follow toggle failed", err);
                    
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid #444",
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: followed.has(key.split(":")[1]) ? "#ff4d4d" : "#8e2dd2ff",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {followed.has(key.split(":")[1]) ? "Unfollow" : "+ Follow"}
                </button>
              )}
            </div>

            <img
              alt=""
              src={img || ""}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", background: "#222" }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
              <span
                style={{
                  color: "#8e2dd2ff",
                  display: "inline-block",
                  padding: "2px 8px",
                  fontSize: 12,
                  borderRadius: 999,
                  border: "1px solid #444",
                }}
              >
                {pill}
              </span>
              <div
                style={{ color: "#8e2dd2ff", fontWeight: 600, lineHeight: 1.2 }}
                dangerouslySetInnerHTML={{ __html: escapeHtml(title) }}
              />
              <div
                style={{ color: "#8e2dd2ff", fontSize: 13 }}
                dangerouslySetInnerHTML={{ __html: escapeHtml(subtitle || "") }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add-to-playlist modal */}
      <AddToPlaylistMenu
        accessToken={accessToken}
        trackUri={pickerTrackUri}
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}


import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./Reels.css";
import AddToPlaylistPopup from "./AddToPlaylistPopup.jsx";

/*local storage helpers (per-user bucket)*/
function getCurrentUser() {
    const fromStores = (k) =>
        window.localStorage.getItem(k) ?? window.sessionStorage.getItem(k);
    const u =
        fromStores("currentUser") ||
        fromStores("username") ||
        fromStores("user") ||
        "";
    return u.trim();
}
function keyFor(user) {
  return `reels:posts:${user}`;
}
function loadPosts(user) {
  try {
    const raw = window.localStorage.getItem(keyFor(user));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function savePosts(user, posts) {
  window.localStorage.setItem(keyFor(user), JSON.stringify(posts));
}

/**small UI bits*/
function Field({ label, children }) {
  return (
    <label className="rl-field">
      <div className="rl-label">{label}</div>
      {children}
    </label>
  );
}

/**pill button (USE THIS FOR POST INTERACTIONS)*/
function Pill({ children, className = "", ...props }) {
  return (
    <button className={`rl-pill ${className}`} {...props}>
        {children}
    </button>
  );
}

async function apiFollow(username, following_username) {
    const r = await fetch("http://localhost:3001/addFollowing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, following_username })
    });
    if (!r.ok) throw new Error(await r.text());
}

async function apiUnfollow(username, following_username) {
    const r = await fetch("http://localhost:3001/removeFollowing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, following_username })
    });
    if (!r.ok) throw new Error(await r.text());
}

async function fetchWhoIFollow(username) {
    try {
        const r = await fetch("http://localhost:3001/getFollowing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
        if (!r.ok) return new Set();
        const rows = await r.json();
        return new Set(rows.map(r => r.user_following));
    } catch { return new Set(); }
}

async function fetchRecommendedUsers({ username, followingSet = new Set(), limit = 12 }) {
    const meLC = (username || "").toLowerCase();
    const followingLC = new Set([...followingSet].map(s => s.toLowerCase()));

    const FALLBACK = [
        {username: "mixmaster", displayName: "Mix Master" },
        {username: "lofi_luna", displayName: "Lofi Luna" },
        {username: "vinylwave", displayName: "VinylWave" },
        {username: "beatsbyjay", displayName: "Beats by Jay" },
        {username: "synthsoda", displayName: "Synth Soda" },
        {username: "indieivy", displayName: "Indie Ivy" },
    ];
    const fromPool = () => {
        const out = [];
        for (const u of FALLBACK) {
            const uLC = u.username.toLowerCase();
            if (uLC === meLC || followingLC.has(uLC)) continue;
            out.push(u);
            if (out.length >= limit) break;
        }
        return out;
    };

    try {
        const r = await fetch(`http://localhost:3001/recommendUsers?username=${encodeURIComponent(username)}&limit=${limit}`);
        if (!r.ok) return fromPool();
        const rows = await r.json();
        const filtered = rows
            .map(u => ({ username: String(u.username), displayName: u.displayName || u.username }))
            .filter(u => {
                const uLC = u.username.toLowerCase();
                return uLC && uLC !== meLC && !followingLC.has(uLC);
            })
            .slice(0, limit);
        return filtered.length ? filtered : fromPool();
    } catch {
        return fromPool();
    }
}

function RecCard({ u, isFollowing, onToggle }) {
    return (
        <div className="rl-rec-card">
            <div className="rl-rec-row">
                <div className="rl-rec-avatar">{(u.displayName || u.username)[0]?.toUpperCase()}</div>
                <div className="rl-rec-meta">
                    <div className="rl-rec-name">{u.displayName || u.username}</div>
                    <div className="rl-rec-handle">@{u.username}</div>
                </div>
            </div>
            <Pill
                className={isFollowing ? "is-following" : ""}
                onClick={() => onToggle(u.username, isFollowing)}
                aria-pressed={isFollowing}
            >
                {isFollowing ? "Following" : "Follow"}
            </Pill>
        </div>
    );
}

export default function Reels({ accessToken, setTrackUri }) {
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    setUser(getCurrentUser());
    const onStorage = () => setUser(getCurrentUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // spotify calls
  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : null),
    [accessToken]
  );

  // composer state
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [caption, setCaption] = useState("");

  // feed state
  const [allPosts, setAllPosts] = useState(() => loadPosts(user));
  const [visibleCount, setVisibleCount] = useState(5); // “infinite” page size
  const [openAddToPl, setOpenAddToPl] = useState(false);
  const [addToPlUri, setAddToPlUri] = useState(null);

  // follow + recommendations state
  const [followingSet, setFollowingSet] = useState(new Set());
  const [recs, setRecs] = useState([]);

  // infinite scroll
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.some((e) => e.isIntersecting);
      if (hit) setVisibleCount((c) => Math.min(c + 5, allPosts.length));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [allPosts.length]);

  // persist when posts change
  useEffect(() => {
    savePosts(user, allPosts);
  }, [user, allPosts]);

  // basic search for the composer
  const doSearch = useCallback(async () => {
    if (!headers || !searchQ.trim()) return;
    setSearching(true);
    try {
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", searchQ.trim());
      url.searchParams.set("type", "track");
      url.searchParams.set("limit", "15");
      const r = await fetch(url, { headers });
      const data = await r.json();
      const items = data?.tracks?.items ?? [];
      const mapped = items.map((t) => ({
        id: t.id,
        uri: t.uri,
        title: t.name,
        artists: (t.artists || []).map((a) => a.name).join(", "),
        img: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "",
      }));
      setResults(mapped);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [headers, searchQ]);

  const resetComposer = () => {
    setSearchQ("");
    setResults([]);
    setSelectedTrack(null);
    setCaption("");
  };

  // create a new post (local only)
  const createPost = () => {
    if (!selectedTrack) return;
    const post = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user,
      track: selectedTrack, // {uri,title,artists,img}
      caption: caption.slice(0, 280),
      comments: [],
      ts: Date.now(),
    };
    setAllPosts((p) => [post, ...p]);
    resetComposer();
  };

  const addComment = (id, text) => {
    setAllPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, comments: [...p.comments, { user, text, ts: Date.now() }] } : p
      )
    );
  };

  const openAddToPlaylist = (uri) => {
    setAddToPlUri(uri);
    setOpenAddToPl(true);
  };

  const playTrack = (uri) => setTrackUri?.(uri);

  useEffect(() => {
    if (!user) { setFollowingSet(new Set()); return; }
    fetchWhoIFollow(user).then(setFollowingSet).catch(() => setFollowingSet(new Set()));
  }, [user]);

  useEffect(() => {
    const who = user || "__guest__";
    fetchRecommendedUsers({ username: who, followingSet, limit: 12 })
        .then(setRecs)
        .catch(() => setRecs([]));
  }, [user, followingSet]);

  const toggleFollow = async (target, currentlyFollowing) => {
    setFollowingSet(prev => {
        const next = new Set(prev);
        if (currentlyFollowing) next.delete(target); else next.add(target);
        return next;
    });
    try { if (currentlyFollowing) await apiUnfollow(user, target); else await apiFollow(user, target); }
    catch {
        setFollowingSet(prev => {
            const next = new Set(prev);
            if (currentlyFollowing) next.add(target); else next.delete(target);
            return next;
        });
    }
  };

  const visiblePosts = allPosts.slice(0, visibleCount);

  return (
    <div className="reels-wrap">
      {/* center feed */}
      <div className="reels-feed">
        {visiblePosts.map((post) => (
          <article key={post.id} className="rl-card">
            {/* header */}
            <div className="rl-card-hdr">
              <div className="rl-avatar">{post.user[0]?.toUpperCase() || "U"}</div>
              <div className="rl-hdr-meta">
                <div className="rl-username">{post.user}</div>
                <div className="rl-sub">@{post.user} • {new Date(post.ts).toLocaleString()}</div>
              </div>
            </div>

            {/* “image” = track cover, click to play */}
            <button
              className="rl-cover-btn"
              title="Play in Playerbar"
              onClick={() => playTrack(post.track.uri)}
            >
              <img className="rl-cover" src={post.track.img || ""} alt="" />
            </button>

            {/* track title/artist */}
            <div className="rl-track">
              <div className="rl-track-title">{post.track.title}</div>
              <div className="rl-track-artist">{post.track.artists}</div>
            </div>

            {/* PUT OTHER ACTION BUTTONS HERE*/}
            <div className="rl-actions">
              <Pill onClick={() => openAddToPlaylist(post.track.uri)}>＋ Add to Playlist</Pill>
            </div>

            {/* caption */}
            {post.caption && <div className="rl-caption">{post.caption}</div>}

            {/* comments */}
            <div className="rl-comments">
              {post.comments.map((c, i) => (
                <div key={i} className="rl-comment">
                  <strong>{c.user}</strong> {c.text}
                </div>
              ))}
              <CommentBox onSubmit={(txt) => addComment(post.id, txt)} />
            </div>
          </article>
        ))}
        {/* sentinel for infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {visibleCount >= allPosts.length && (
            <section className="rl-rec-wrap">
                <h3 className="rl-rec-title">Recommended accounts to follow</h3>

                {recs.length === 0 ? (
                    <div className="rl-rec-empty">No suggestions right now - check back soon.</div>
                ) : (
                    <div className="rl-rec-grid">
                        {recs.map((u) => (
                            <RecCard
                                key={u.username}
                                u={u}
                                isFollowing={followingSet.has(u.username)}
                                onToggle={toggleFollow}
                            />
                        ))}
                    </div>
                )}

                <div className="rl-rec-sub">Suggestions are based on popular posters & your activity.</div>
            </section>
        )}
      </div>

      {/* POST CREATOR */}
      <aside className="reels-composer">
        <div className="rl-compose-card">
          <h3>Create Post</h3>

          <Field label="Choose a song">
            <div className="rl-row">
              <input
                className="rl-input"
                placeholder="Search tracks…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
              />
              <Pill onClick={doSearch}>{searching ? "Searching…" : "Search"}</Pill>
            </div>

            {selectedTrack && (
              <div className="rl-picked">
                <img alt="" src={selectedTrack.img} />
                <div>
                  <div className="rl-picked-title">{selectedTrack.title}</div>
                  <div className="rl-picked-artist">{selectedTrack.artists}</div>
                </div>
                <button className="rl-x" onClick={() => setSelectedTrack(null)}>×</button>
              </div>
            )}

            {results.length > 0 && !selectedTrack && (
              <div className="rl-results">
                {results.map((t) => (
                  <button key={t.id} className="rl-result" onClick={() => setSelectedTrack(t)}>
                    <img alt="" src={t.img} />
                    <div className="rl-rmeta">
                      <div className="rl-rtitle">{t.title}</div>
                      <div className="rl-rartist">{t.artists}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Field label="Caption">
            <textarea
              className="rl-input"
              rows={3}
              maxLength={280}
              placeholder="Say something about this track…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </Field>

          <div className="rl-row">
            <Pill onClick={createPost} disabled={!selectedTrack}>
              Post to Feed
            </Pill>
          </div>
        </div>
      </aside>

      <AddToPlaylistPopup
        accessToken={accessToken}
        isOpen={openAddToPl}
        trackUri={addToPlUri}
        onClose={() => setOpenAddToPl(false)}
      />
    </div>
  );
}

/**COMMENT SECTION */
function CommentBox({ onSubmit }) {
  const [v, setV] = useState("");
  return (
    <form
      className="rl-cform"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        onSubmit(v.trim());
        setV("");
      }}
    >
      <input
        className="rl-input"
        placeholder="Add a comment…"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button className="rl-pill" type="submit">Comment</button>
    </form>
  );
}

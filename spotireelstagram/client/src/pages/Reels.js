import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./Reels.css";
import AddToPlaylistPopup from "./AddToPlaylistPopup.jsx";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function getCurrentUser() {
  const token = getCookie("token");
  if (!token) return null;
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.username;
}

// Normalize a Spotify track into a plain 22-char ID (safe for backend)
function toTrackId(x) {
  if (!x) return null;
  const s = typeof x === "string" ? x : x.uri || "";
  if (s.startsWith("spotify:track:")) return s.split(":").pop();
  const m = s.match(/track\/([A-Za-z0-9]{22})|^([A-Za-z0-9]{22})$/);
  return m ? (m[1] || m[2]) : null;
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
  const [allPosts, setAllPosts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5); // “infinite” page size
  const [openAddToPl, setOpenAddToPl] = useState(false);
  const [addToPlUri, setAddToPlUri] = useState(null);

  // follow + recommendations state
  const [followingSet, setFollowingSet] = useState(new Set());
  const [recs, setRecs] = useState([]);

  // like/dislike
  const [liked, setLiked] = useState(() => new Set());
  const [disliked, setDisliked] = useState(() => new Set());

  const toggleLike = (postId) => {
    setLiked(prev => {
        const next = new Set(prev);
        if (next.has(postId)) next.delete(postId);
        else next.add(postId);
        return next;
    });
    setDisliked(prev => {
        if (!prev.has(postId)) return prev;
        const next = new Set(prev); next.delete(postId); return next;
    });
  };
  
  const toggleDislike = (postId) => {
    setDisliked(prev => {
        const next = new Set(prev);
        if (next.has(postId)) next.delete(postId);
        else next.add(postId);
        return next;
    });
    setLiked(prev => {
        if (!prev.has(postId)) return prev;
        const next = new Set(prev); next.delete(postId); return next;
    });
  };

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
  
  const loadFeed = useCallback(async () => {
    const username = getCurrentUser();
    if (!username) { setAllPosts([]); return; }

  // 1) fetch my posts + following posts
  const [mine, following] = await Promise.all([
    fetch("http://localhost:3001/getMyPosts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    }).then(r => r.ok ? r.json() : []),
    fetch("http://localhost:3001/getFollowingPost", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    }).then(r => r.ok ? r.json() : []),
  ]);

  const rows = [...mine, ...following];

  // 2) collect unique Spotify IDs from row.song (can be URI/URL/ID)
  const getId = (song) => {
    if (!song) return null;
    if (song.startsWith("spotify:track:")) return song.split(":").pop();
    const m = song.match(/track\/([A-Za-z0-9]+)|^([A-Za-z0-9]{22})$/);
    return m ? (m[1] || m[2]) : null;
  };
  const ids = Array.from(new Set(rows.map(r => getId(r.song)).filter(Boolean)));

  // 3) enrich via Spotify /tracks in batches of 50
  const idToMeta = new Map();
  if (headers && ids.length) {
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const url = new URL("https://api.spotify.com/v1/tracks");
      url.searchParams.set("ids", chunk.join(","));
      const res = await fetch(url, { headers });
      const data = await res.json().catch(() => ({}));
      for (const t of (data.tracks || [])) {
        idToMeta.set(t.id, {
          uri: t.uri,
          title: t.name,
          artists: (t.artists || []).map(a => a.name).join(", "),
          img: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || ""
        });
      }
    }
  }

  // 4) map DB rows -> UI posts and sort by time desc
  const mapped = rows.map(r => {
    const id = getId(r.song);
    const meta = id ? idToMeta.get(id) : null;
    return {
      id: r.post_ID,
      user: r.username,
      track: meta || { uri: r.song, title: r.song, artists: "", img: "" },
      caption: r.body || "",
      comments: [],
      ts: Date.parse(r.time_stamp) || Date.now()
    };
  }).sort((a, b) => b.ts - a.ts);

    // fetch comments per post
  const withComments = await Promise.all(
    mapped.map(async (p) => {
      try {
        const r = await fetch("http://localhost:3001/getComment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_ID: p.id }),
        });
        const rows = r.ok ? await r.json() : [];
        const comments = rows.map((row) => ({
          user: row.username,
          text: row.body,
          ts: Date.parse(row.time_stamp) || Date.now(),
        }));
        return { ...p, comments };
      } catch {
        return p; // keep the post even if comments fail
      }
    })
  );

  setAllPosts(withComments);
}, [headers]);

useEffect(() => { loadFeed(); }, [loadFeed]);


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

  // create a new post (BACKEND)
  const createPost = async () => {
  if (!selectedTrack) return;
  const username = getCurrentUser();
  if (!username) return alert("Please log in again.");

  const trackId = toTrackId(selectedTrack);
  if (!trackId) return alert("Could not extract track ID from selection.");

  const post_body = caption.slice(0, 280);

  const r = await fetch("http://localhost:3001/createPost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, song_title: trackId, post_body })
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    return alert(`Failed to post: ${r.status} ${t}`);
  }
  await loadFeed();
  resetComposer();
};

  const addComment = async (postId, text) => {
    const username = getCurrentUser();
    if (!username) return alert("Please log in again.");
    try {
      const r = await fetch("http://localhost:3001/createComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, post_ID: postId, body: text }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return alert(`Failed to comment: ${r.status} ${t}`);
      }
      // optimistic UI + stable
      setAllPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, comments: [...p.comments, { user: username, text, ts: Date.now() }] }
            : p
        )
      );
    } catch (e) {
      alert("Network error while commenting.");
    }
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
    fetchRecommendedUsers({ username: who, followingSet, limit: 5 })
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

            <div className="rl-actions">
                <button
                    className="rl-icon-btn like"
                    aria-pressed={liked.has(post.id)}
                    title={liked.has(post.id) ? "Unlike" : "Like"}
                    onClick={() => toggleLike(post.id)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21s-6.7-4.2-9.3-7.4C.6 10.4 1.2 6.9 4 5.4 6 4.3 8.5 4.9 10 6.6c1.5-1.7 4-2.3 6-1.2 2.9 1.5 3.5 5 1.3 8.2C18.7 16.8 12 21 12 21z"/>
                    </svg>
                </button>

                <button
                    className="rl-icon-btn dislike"
                    aria-pressed={disliked.has(post.id)}
                    title={disliked.has(post.id) ? "Remove dislike" : "Dislike"}
                    onClick={() => toggleDislike(post.id)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15 3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4.6l-1 4.3c-.2.9.7 1.7 1.5 1.2l4.9-3.1A2 2 0 0 0 17 16V5a2 2 0 0 0-2-2zM20 5h-2v10h2a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/>
                    </svg>
                </button>
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

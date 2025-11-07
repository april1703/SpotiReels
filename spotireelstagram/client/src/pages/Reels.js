import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./Reels.css";
import AddToPlaylistPopup from "./AddToPlaylistPopup.jsx";

/*local storage helpers (per-user bucket)*/
function getCurrentUser() {
  //store this on successful Login
  return window.localStorage.getItem("currentUser");
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
function Pill({ children, onClick }) {
  return <button className="rl-pill" onClick={onClick}>{children}</button>;
}

export default function Reels({ accessToken, setTrackUri }) {
  const user = getCurrentUser();

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

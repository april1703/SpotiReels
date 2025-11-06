const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const cors = require("cors");
const bodyParser = require('body-parser');
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = String(process.env.JWT_SECRET);
const PEPPER = String(process.env.PEPPER);
const SQL_HOST = String(process.env.MYSQL_HOST);
const SQL_USER = String(process.env.MYSQL_USER);
const SQL_PASSWORD = String(process.env.MYSQL_PASSWORD);
const SPOTIFY_CLIENT_ID = String(process.env.SPOTIFY_CLIENT_ID);
const SPOTIFY_SECRET = String(process.env.SPOTIFY_SECRET);

const app = express();
app.use(cors());
app.use(bodyParser.json());


const SQL_REQUESTS = {
  user: {
    checkExisting: "SELECT username FROM users WHERE username = ?",
    register: "INSERT INTO users (username, password, salt, isDarkMode, isExplicit) VALUES (?, ?, ?, FALSE, FALSE)",
    checkPassword: "SELECT password, salt FROM users WHERE username = ?",
    changePassword: "UPDATE users SET password = ?, salt = ? WHERE username = ?",
    changeIsDarkMode: "UPDATE users SET isDarkMode = ? WHERE username = ?",
    changeExplicit: "UPDATE users SET isExplicit = ? WHERE username = ?",
  },

  following: {
    add: "INSERT INTO following (username, user_following) VALUES (?, ?)",
    remove: "DELETE FROM following WHERE username = ? AND user_following = ?",
    get: "SELECT user_following FROM following WHERE username = ?",
  },

  playlist: {
    contents_add: "INSERT INTO playlist_contents (username, list_name, song) VALUES (?, ?, ?)",
    contents_remove: "DELETE FROM playlist_contents WHERE username = ? AND list_name = ? AND song = ?",
    contents_get: "SELECT song FROM playlist_contents WHERE username = ? AND list_name = ?",
  },

  liked: {
    add: "INSERT INTO liked_songs (username, song) VALUES (?, ?)",
    remove: "DELETE FROM liked_songs WHERE username = ? AND song = ?",
    get: "SELECT song FROM liked_songs WHERE username = ?",
  }
};

// SQL CONNECTION AND HEALTH CHECK
const Connection = mysql.createConnection({
    host: SQL_HOST,
    user: SQL_USER,
    password: SQL_PASSWORD,
    database: "spottireels",
});
Connection.ping(err => {
  if (err) console.error("Ping failed:", err);
  else console.log("DB connection OK");
});

// SPOTIFY API CONNECTION
app.post('/auth/refresh', (req, res) => {
    const refreshToken = req.body.refreshToken
    const spotifyApi = new SpotifyWebApi({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        clientId: SPOTIFY_CLIENT_ID, 
        clientSecret: SPOTIFY_SECRET, 
        refreshToken,
    })

    spotifyApi
        .refreshAccessToken().then
        (data => {
            res.json({
                accessToken: data.body.access_token,
                expiresIn: data.body.expires_in
            })
        })
        .catch((err) => {
            console.log(err)
            res.sendStatus(400)
        })
    })

app.post('/auth/login', (req, res) => {
    const code = req.body.code;
    const spotifyApi = new SpotifyWebApi({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        clientId: SPOTIFY_CLIENT_ID,
        clientSecret: SPOTIFY_SECRET
    })

    spotifyApi.authorizationCodeGrant(code).then(data => {
        res.json({
            accessToken: data.body.access_token,
            refreshToken: data.body.refresh_token,
            expiresIn: data.body.expires_in,
        }
        
    ) 
    })
    .catch(err => {
        console.log(err)
        res.sendStatus(400)
    })
})

app.post('/spotify/liked', async (req, res) => {
    try {
        const { refreshToken, limit = 50, offset = 0 } = req.body || {};
        if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });

        const safeLimit = Math.max(1, Math.min(50, Number(limit) || 50));
        const safeOffset = Math.max(0, Number(offset) || 0);

        const spotify = makeSpotify({ refreshToken });
        const { body: refreshed } = await spotify.refreshAccessToken();
        spotify.setAccessToken(refreshed.access_token);

        const { body } = await spotify.getMySavedTracks({ limit: safeLimit, offset: safeOffset });

        const items = flattenSavedTracks(body);
        const total = body.total ?? items.length;
        const nextOffset = safeOffset + items.length < total ? safeOffset + items.length : null;


        return res.json({ items, total, nextOffset });
    } catch (err) {
        console.error('POST /spotify/liked error', err?.body || err);
        const status = err?.statusCode || 500;
        return res.status(status).json({ error: 'Failed to load liked songs' });
    }
});

function makeSpotify({ accessToken, refreshToken } = {}) {
    const api = new SpotifyWebApi({
        clientId: SPOTIFY_CLIENT_ID,
        clientSecret: SPOTIFY_SECRET,
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
    });
    if (accessToken) api.setAccessToken(accessToken);
    if (refreshToken) api.setRefreshToken(refreshToken);
    return api;
}

async function getSpotifyFromReq(req) {
    const auth = req.headers.authorization || '';
    const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    let spotify;

    if (accessToken) {
        spotify = makeSpotify({ accessToken });
        return spotify;
    }

    const refreshToken = req.body?.refreshToken || req.query?.refreshToken;
    if (refreshToken) {
        spotify = makeSpotify({ refreshToken });
        const { body: rt } = await spotify.refreshAccessToken();
        spotify.setAccessToken(rt.access_token);
        return spotify;
    }
    
    const err = new Error('Missing access token or refreshToken');
    err.statusCode = 401;
    throw err;
}

app.get('/spotify/liked', async (req, res) => {
    try {
        const safeLimit = Math.max(1, Math.min(50, Number(req.query.limit) || 50));
        const safeOffset = Math.max(0, Number(req.query.offset) || 0);

        const auth = req.headers.authorization || '';
        const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (!accessToken) return res.status(401).json({ error: 'Missing Bearer access token' });

        const spotify = makeSpotify({ accessToken });
        const { body } = await spotify.getMySavedTracks({ limit: safeLimit, offset: safeOffset });
        const items = flattenSavedTracks(body);
        const total = body.total ?? items.length;
        const nextOffset = safeOffset + items.length < total ? safeOffset + items.length : null;

        res.json({ items, total, nextOffset });
    } catch (err) {
        console.error('GET /spotify/liked error', err?.body || err);
        const status = err?.statusCode === 401 ? 401 : 500;
        res.status(status).json({ error: 'Failed to load liked songs' });
    }
});

function flattenSavedTracks(body) {
    return (body.items || []).map(({ added_at, track }) => ({
        id: track.id,
        name: track.name,
        artists: (track.artists || []).map(a => a.name).join(', '),
        album: {
            id: track.album?.id ?? null,
            name: track.album?.name ?? '',
            images: track.album?.images ?? [],
        },
        image: (track.album?.images?.[0]?.url) || '',
        duration_ms: track.duration_ms,
        preview_url: track.preview_url,
        uri: track.uri,
        added_at,
    }));
}

app.post('/spotify/like', async (req, res) => {
    try {
        const { refreshToken, trackId } = req.body || {};
        if (!refreshToken || !trackId) return res.status(400).json({ error: 'Missing refreshToken or trackId' });

        const spotify = makeSpotify({ refreshToken });
        const { body: rt } = await spotify.refreshAccessToken();
        spotify.setAccessToken(rt.access_token);

        await spotify.addToMySavedTracks([trackId]);

        return res.json({ liked: true });
    } catch (err) {
        console.error('POST /spotify/like', err?.body || err);
        if (err?.statusCode === 403) return res.status(403).json({ error: 'missing_scope', scope: 'user-library-modify' });
        if (err?.statusCode === 401) return res.status(401).json({ error: 'unauthorized' });
        return res.status(500).json({ error: 'server_error' });
    }
});

app.post('/spotify/unlike', async (req, res) => {
    try {
        const { refreshToken, trackId } = req.body || {};
        if (!refreshToken || !trackId) return res.status(400).json({ error: 'Missing refreshToken or trackId' });

        const spotify = makeSpotify({ refreshToken });
        const { body: rt } = await spotify.refreshAccessToken();
        spotify.setAccessToken(rt.access_token);

        await spotify.removeFromMySavedTracks([trackId]);

        return res.json({ liked: true });
    } catch (err) {
        console.error('POST /spotify/unlike', err?.body || err);
        if (err?.statusCode === 403) return res.status(403).json({ error: 'missing_scope', scope: 'user-library-modify' });
        if (err?.statusCode === 401) return res.status(401).json({ error: 'unauthorized' });
        return res.status(500).json({ error: 'server_error' });
    }
});

app.get('/spotify/like-status', async (req, res) => {
    try {
        const idsParam = (req.query.ids || '').trim();
        if (!idsParam) return res.status(400).json({ error: 'Missing ids' });

        const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 50);
        if (!ids.length) return res.status(400).json({ error: 'No valid ids' });

        let spotify;

        const auth = req.headers.authorization || '';
        const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        if (accessToken) {
            spotify = makeSpotify({ accessToken });
        } else if (req.query.refreshToken) {
            spotify = makeSpotify({ refreshToken: req.query.refreshToken });
            const { body: rt } = await spotify.refreshAccessToken();
            spotify.setAccessToken(rt.access_token);
        } else {
            return res.status(401).json({ error: 'Missing access token or refreshToken' });
        }

        const { body } = await spotify.containsMySavedTracks(ids);

        const map = {};
        ids.forEach((id, i) => { map[id] = !!body[i]; });

        return res.json({ likedMap: map });
    } catch (err) {
        console.error('GET /spotify/like-status', err?.body || err);
        const status = err?.statusCode === 401 ? 401 : 500;
        return res.status(status).json({ error: 'Failed to check like status' });
    }
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
})

// RETURN ID FUNCTION: takes nothing, returns network status and a string
app.get('/spotify-id', (request, response) => {
    console.log(`User requested Spotify ID: ${SPOTIFY_CLIENT_ID}`);
    return response.status(200).json(SPOTIFY_CLIENT_ID);
    
})

// REGISTRATION FUNCTION: takes 4 strings, returns network status and message
app.post("/register", (request, response) => {
    // Register page passes username, password, checkPassword
    const {username, password} = request.body;
    if (checkRegex([username, password])) {
        return response.status(400).send("Invalid characters used.");
    }
    Connection.query(SQL_REQUESTS.user.checkExisting, [username], (SQLerror, SQLresults) =>{
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        }

        if (SQLresults.length !== 0) {
            return response.status(409).send("User already exists");
        }
    console.log("Creating new user...");
    const newSalt = crypto.randomBytes(Math.ceil(12 / 2))
    .toString("hex")
    .slice(0, 12);
    bcrypt.hash(newSalt + password + PEPPER, 12)
    .then(hashedPassword => {
        Connection.query(SQL_REQUESTS.user.register, [username, hashedPassword, newSalt], (SQLerror, SQLresults) => {
            if (SQLerror) {
                console.error(`BCrypt error: ${SQLerror.message}`);
                return response.status(500).send(`Database error: ${SQLerror}`);
            }
            console.error("Success!");
            return response.status(201).send(`User ${username} successfully created.`);
        })
    })
     .catch(err => {
         console.error(err);
         return response.status(500).send("Encryption error.")
     })
    });
});

// LOGIN FUNCTION: takes 2 strings, returns network status and message
app.post("/login", (request, response) => {
    let {username, password} = request.body;
    if (checkRegex([username, password])) {
        return response.status(403).send("Invalid characters in username or password");
    }
    Connection.query(SQL_REQUESTS.user.checkPassword, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        }

        if (SQLresults.length === 0) {
            return response.status(404).send("User not found");
        }
        bcrypt.compare( SQLresults[0].salt + password + PEPPER, SQLresults[0].password)
        .then(isMatch => {
            if (isMatch) {
                const token = jwt.sign({username}, JWT_SECRET, {expiresIn: "2h"});
                return response.status(200).json({token});
            } else {
                return response.status(403).send("Incorrect password.");
            }
        })
        .catch(bCryptError => {
            return response.status(500).send(`Encryption error: ${bCryptError.message}`);
        });
    });
});

// CHANGE PASSWORD FUNCTION: takes 3 strings, returns network status and message
app.post("/changePassword", (request, response) => {
    let {username, currentPassword, proposedPassword} = request.body;
    if(checkRegex([username, currentPassword, proposedPassword])) {
        return response.status(403).send("Invalid characters in request body: Access denied.");
    }
    Connection.query(SQL_REQUESTS.user.checkPassword, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        }

        if (SQLresults.length === 0) {
            return response.status(404).send("User not found (Inaccessible content warning!)");
        }
        bcrypt.compare(SQLresults[0].salt + currentPassword + PEPPER, SQLresults[0].password)
        .then(isMatch => {
            if (!isMatch) {
                return response.status(403).send("Incorrect current password. Access denied.");
            }
            else if (isMatch){
                let newSalt = crypto.randomBytes(Math.ceil(12 / 2))
                .toString("hex")
                .slice(0, 12);
                bcrypt.hash(newSalt + proposedPassword + PEPPER, 12)
                .then(hashedPassword => {
                    Connection.query(SQL_REQUESTS.user.changePassword, [hashedPassword, newSalt, username], (SQLerror_2, SQLresults_2) => {
                        if (SQLerror_2) {
                        return response.status(500).send(`Database error on second try: ${SQLerror}`);
                        }
                        return response.status(200).send(`Password for user ${username} successfully changed.`);
                    })

                })
            }

        })
    })
})

// CHANGE LIGHTING MODE: takes a boolean and string, returns network status and message
app.post("/changeLightingMode", (request, response) => {
    let {username, isLightingModeRequest} = request.body;
    Connection.query(SQL_REQUESTS.user.changeIsDarkMode, [isLightingModeRequest, username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        }
        else {
            return response.status(200).send(`Successfully changed lighting setting.`);
        }
    })
}) 

// CHANGE EXPLICIT: takes a boolean and string, returns network status and message
app.post("/changeExplicit", (request, response) => {
    let {username, isExplicitRequest} = request.body;
    Connection.query(SQL_REQUESTS.user.changeExplicit, [isExplicitRequest, username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        } else {
            return response.status(200).send(`Successfully changed explicit settings.`);
        }
    })
})

// ADD FOLLOWING: takes two strings, returns network status and message
app.post("/addFollowing", (request, response) => {
    let {username, following_username} = request.body;
    if(checkRegex([username, following_username])) {
        return response.status(403).message("Invalid characters in request body: Access denied.");
    }
    Connection.query(SQL_REQUESTS.following.add, [username, following_username], (SQLerror, SQLresults) => {
        if (SQLerror.errno === 1062) {
            return response.status(409).send(`User ${username} is already following ${following_username}.`);
        } else if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        } else {
            return response.status(200).send(`Successfully followed user ${following_username}`);
        }
    })
    
})

//REMOVE FOLLOWING: takes two strings, returns network status and message
app.post("/removeFollowing", (request, response) => {
    let {username, following_username} = request.body;
    if(checkRegex([username, following_username])) {
        return response.status(403).send("Invalid characters in request body: Access denied.");
    }
    Connection.query(SQL_REQUESTS.following.remove, [username, following_username], (SQLerror, SQLresults) => {
        if(SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        } else {
            return response.status(200).send(`User ${username} successfully unfollowed ${following_username}`);
        }
    })
})

// GET FOLLOWING: takes a string, returns network status, a message, and, on 200, a JSON body
app.post("/getFollowing", (request, response) => {
    let {username} = request.body;
    if(checkRegex([username])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    Connection.query(SQL_REQUESTS.following.get, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        } else if (SQLresults.length === 0) {
            return response.status(404).send(`Cannot find following for user ${username}. Is ${username} following anyone?`);
        } else {
            return response.status(200).json(SQLresults);
        }
    })
})

// ADD TO PLAYLIST: takes three strings, returns network status and message
app.post("/addToPlaylist", (request, response) => {
    let{username, list_name, song} = request.body;
    if(checkRegex([username, list_name, song])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    Connection.query(SQL_REQUESTS.playlist.contents_add, [username, list_name, song], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`)
        } 
        else {
            return response.status(200).send(`Successfully added ${song} to ${username}\'s playlist ${list_name}`)
        }
    })
})

// REMOVE FROM PLAYLIST: takes three strings, returns network status and message
app.post("/removeFromPlaylist", (request, response) => {
    let {username, list_name, song} = request.body;
    if(checkRegex([username, list_name, song])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    Connection.query(SQL_REQUESTS.playlist.contents_remove, [username, list_name, song], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`)
        }
        else {
            return response.status(200).send(`Successfully removed ${song} from ${username}\'s ${list_name}`)
        }
    })
})

app.get('/spotify/playlists', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 24));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const spotify = await getSpotifyFromReq(req);
    // current user's playlists
    const { body } = await spotify.getUserPlaylists({ limit, offset });

    const items = (body.items || []).map(p => ({
      id: p.id,
      name: p.name,
      images: p.images || [],
      tracksTotal: p.tracks?.total ?? 0,
      owner: p.owner?.display_name || '',
      public: !!p.public,
    }));

    const total = body.total ?? items.length;
    const nextOffset = offset + items.length < total ? offset + items.length : null;

    res.json({ items, total, nextOffset });
  } catch (err) {
    console.error('GET /spotify/playlists', err?.body || err);
    res.status(err?.statusCode || 500).json({ error: 'Failed to load playlists' });
  }
});

// GET PLAYLIST: takes two strings, returns network status, a message, and, on 200, a JSON body 
app.post("/getPlaylist", (request, response) => {
    let {username, list_name} = request.body;
    if(checkRegex([username, list_name, song])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    Connection.query(SQL_REQUESTS.playlist.contents_get, [username, list_name], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`)
        } else if (SQLresults.length === 0) {
            return response.status(404).send("Error: Playlist not found")
        } else {
            return response.status(200).json(SQLresults)
        }
    })
})

// ADD TO LIKED: takes two strings, returns network status and message
app.post("/addLiked", (request, response) => {
    let {username, song} = request.body;
    if(checkRegex([username, song])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    Connection.query(SQL_REQUESTS.liked.add, [username, song], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`)
        } else {
            return response.status(200).send(`Song ${song} successfully added to ${username}\'s liked songs list`)
        }
    })
})

// REMOVE LIKED: takes two strings, returns network status and message
app.post("/removeLiked", (request, response) => {
    let {username, song} = request.body;
    if(checkRegex([username, song])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    Connection.query(SQL_REQUESTS.liked.remove, [username, song], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`)
        } else {
            return response.status(200).send(`Song ${song} successfully removed from ${username}\'s liked songs list`)
        }
    })
})

// GET LIKED: takes a string, returns network status, a message, and, on 200, a JSON body
app.post("/getLiked", (request, response) => {
    let {username, song} = request.body;
    if(checkRegex([username, song])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    Connection.query(SQL_REQUESTS.liked.get, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`)
        } else if (SQLresults.length === 0) {
            return response.status(404).send(`Error: user ${username}\'s liked songs list is empty`)
        } else {
            return response.status(200).json(SQLresults)
        }
    })
})

//  HELPER FUNCTIONS
// REGEX CHECK: takes an array, returns a boolean
const SQL_REGEX = /["':;(){}|\/\\]/;
function checkRegex(listOfItems) {
    for (let i = 0; i < listOfItems.length; i++) {
        if(SQL_REGEX.test(listOfItems[i])){
            console.log("Register input:", username, password);
            return true;
        }
    }
    return false;
}
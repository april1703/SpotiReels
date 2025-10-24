const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const cors = require("cors");
const bodyParser = require('body-parser');
require("dotenv").config();

const PEPPER = String(process.env.PEPPER);
const SQL_HOST = String(process.env.MYSQL_HOST);
const SQL_USER = String(process.env.MYSQL_USER);
const SQL_PASSWORD = String(process.env.MYSQL_PASSWORD);
const SPOTIFY_CLIENT_ID = String(process.env.SPOTIFY_CLIENT_ID);
const SPOTIFY_SECRET = String(process.env.SPOTIFY_SECRET);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const ExistingUserSQLCheck = "SELECT username FROM users WHERE username = ?";
const UserRegistrationSQL = "INSERT INTO users (username, spotifyUser, password, salt, isDarkMode, isExplicit) VALUES (?, ?, ?, ?, FALSE, FALSE)";
const CheckInputPasswordSQL = "SELECT password, salt FROM users WHERE username = ?";
const PasswordChangeSQL = "UPDATE users SET password = ?, salt = ? WHERE username = ?";
const ChangeExplicitSQL = "UPDATE users SET isExplicit = ? WHERE username = ?";
const AddFollowingSQL = "INSERT INTO following (username, user_following) VALUES (?, ?)"

// SQL CONNECTION AND HEALTH CHECK
const UserConnection = mysql.createConnection({
    host: SQL_HOST,
    user: SQL_USER,
    password: SQL_PASSWORD,
    database: "spottireels",
});
UserConnection.ping(err => {
  if (err) console.error("Ping failed:", err);
  else console.log("DB connection OK");
});

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
        })
    })
    .catch(err => {
        console.log(err)
        res.sendStatus(400)
    })
})


app.listen(3001, () => {
    console.log('Server is running on port 3001');
})

app.get('/spotify-id', (request, response) => {
    console.log(`User requested Spotify ID: ${SPOTIFY_CLIENT_ID}`);
    return response.status(200).json(SPOTIFY_CLIENT_ID);
    
})

//REGISTRATION FUNCTION: takes 4 strings, returns network status and message
app.post("/register", (request, response) => {
    // Register page passes username, spotifyUser, password, checkPassword
    const {username, spotifyUser, password} = request.body;
    if (checkRegex([username, spotifyUser, password])) {
        return response.status(400).send("Invalid characters used.");
    }
    UserConnection.query(ExistingUserSQLCheck, [username], (SQLerror, SQLresults) =>{
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
        UserConnection.query(UserRegistrationSQL, [username, spotifyUser, hashedPassword, newSalt], (SQLerror, SQLresults) => {
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
    UserConnection.query(CheckInputPasswordSQL, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        }

        if (SQLresults.length === 0) {
            return response.status(404).send("User not found");
        }
        bcrypt.compare( SQLresults[0].salt + password + PEPPER, SQLresults[0].password)
        .then(isMatch => {
            if (isMatch) {
                return response.status(200).send(`Password success; user ${username} logged in`);
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
    UserConnection.query(CheckInputPasswordSQL, [username], (SQLerror, SQLresults) => {
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
                bcrypt.hash(newSalt + password + PEPPER, 12)
                .then(hashedPassword => {
                    UserConnection.query(PasswordChangeSQL, [hashedPassword, newSalt, username], (SQLerror_2, SQLresults_2) => {
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
    UserConnection.query(ChangeLightingModeSQL, [isLightingModeRequest, username], (SQLerror, SQLresults) => {
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
    UserConnection.query(ChangeExplicitSQL, [isExplicitRequest, username], (SQLerror, SQLresults) => {
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
    UserConnection.query(AddFollowingSQL, [username, following_username], (SQLerror, SQLresults) => {
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
    UserConnection.query(RemoveFollowingSQL, [username, following_username], (SQLerror, SQLresults) => {
        if(SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        } else {
            return response.status(200).send(`User ${username} successfully unfollowed ${following_username}`);
        }
    })
})

// RETRIEVE FOLLOWING: takes a string, returns network status, a message, and, on 200, a JSON body
app.post("/getFollowing", (request, response) => {
    let {username} = request.body;
    if(checkRegex([username])) {
        return response.status(403).send("Invalid characters in request body: Access denied.")
    }
    UserConnection.query(GetFollowingListSQL, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return response.status(500).send(`Database error: ${SQLerror.message}`);
        } else if (SQLresults.length === 0) {
            return response.status(404).send(`Cannot find following for user ${username}. Is ${username} following anyone?`);
        } else {
            return response.status(200).send(`Found following for user ${username}`).json(SQLresults);
        }
    })
})

//  HELPER FUNCTIONS
//REGEX CHECK: takes an array, returns a boolean
const SQL_REGEX = /["':;(){}|\/\\]/;
function checkRegex(listOfItems) {
    for (let i = 0; i < listOfItems.length; i++) {
        if(SQL_REGEX.test(listOfItems[i])){
            console.log("Register input:", username, spotifyUser, password);
            return true;
        }
    }
    return false;
}
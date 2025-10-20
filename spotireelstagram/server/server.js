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
const UserRegistrationSQL = "INSERT INTO users (username, spotifyUsername, email, password, salt, isDarkMode, isExplicit) VALUES (?, ?, ?, ?, ?, FALSE, FALSE)";
const CheckInputPasswordSQL = "SELECT password, salt FROM users WHERE username = ?";
const PasswordChangeSQL = "UPDATE users SET password = ?, salt = ? WHERE username = ?";
const ChangeExplicitSQL = "UPDATE users SET isExplicit = ? WHERE username = ?";

// SQL CONNECTION AND HEALTH CHECK
const UserConnection = mysql.createConnection({
    host: SQL_HOST,
    user: SQL_USER,
    password: SQL_PASSWORD,
    database: "users",
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
        clientId: 'e9d0314470b945a4a27c5c708b06b775',
        clientSecret: '139bb072fba243d0a849744143a5539d'
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

//REGISTRATION FUNCTION: takes 4 strings, returns network status and message
app.post("/register", (request, result) => {
    let {username, spotifyusername, email, password} = request.body;
    if (regexCheck([username, spotifyusername, email, password])) {
        return result.status(400).send(new Error("Invalid characters used."));
    }
    UserConnection.query(ExistingUserSQLCheck, [username], (SQLerror, SQLresults) =>{
        if (SQLerror) {
            return result.status(500).send(new Error(`Database error: ${SQLerror.message}`));
        }

        if (SQLresults.length !== 0) {
            return result.status(409).send(new Error('User already exists'));
        }
    })
    let newSalt = crypto.randomBytes(Math.ceil(12 / 2))
    .toString("hex")
    .slice(0, 12);
    bcrypt.hash(newSalt + password + PEPPER, 12)
    .then(hashedPassword => {
        UserConnection.query(UserRegistrationSQL, [username, spotifyusername, email, hashedPassword, newSalt], (SQLerror, SQLresults) => {
            if (SQLerror) {
            return result.status(500).send(`Database error: ${SQLerror}`);
            }
            return result.status(200).send(`User ${username} successfully created.`);
        })
    });
});

// LOGIN FUNCTION: takes 2 strings, returns network status and message
app.post("/login", (request, result) => {
    let {username, password} = request.body;
    if (checkRegex([username, password])) {
        return result.status(400).send("Invalid characters in username or password");
    }
    UserConnection.query(CheckInputPasswordSQL, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return result.status(500).send(`Database error: ${SQLerror.message}`);
        }

        if (SQLresults.length === 0) {
            return result.status(404).send("User not found");
        }
        bcrypt.compare( SQLresults[0].salt + password + PEPPER, SQLresults[0].password)
        .then(isMatch => {
            if (isMatch) {
                return result.status(200).send(`Password success; user ${username} logged in`);
            } else {
                return result.status(403).send("Incorrect password.");
            }
        })
        .catch(bCryptError => {
            return result.status(500).send(`Encryption error: ${bCryptError.message}`);
        });
    });
});

// CHANGE PASSWORD FUNCTION: takes 3 strings, returns network status and message
app.post("/changepassword", (request, result) => {
    let {username, currentPassword, proposedPassword} = request.body;
    if(checkRegex([username, currentPassword, proposedPassword])) {
        return result.status(400).send("invalid characters in username or password");
    }
    UserConnection.query(CheckInputPasswordSQL, [username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return result.status(500).send(`Database error: ${SQLerror.message}`);
        }

        if (SQLresults.length === 0) {
            return result.status(404).send("User not found (Inaccessible content warning!)");
        }
        bcrypt.compare(SQLresults[0].salt + currentPassword + PEPPER, SQLresults[0].password)
        .then(isMatch => {
            if (!isMatch) {
                return result.status(403).send("Incorrect current password. Access denied.");
            }
            else if (isMatch){
                let newSalt = crypto.randomBytes(Math.ceil(12 / 2))
                .toString("hex")
                .slice(0, 12);
                bcrypt.hash(newSalt + password + PEPPER, 12)
                .then(hashedPassword => {
                    UserConnection.query(PasswordChangeSQL, [hashedPassword, newSalt, username], (SQLerror_2, SQLresults_2) => {
                        if (SQLerror_2) {
                        return result.status(500).send(`Database error on second try: ${SQLerror}`);
                        }
                        return result.status(200).send(`Password for user ${username} successfully changed.`);
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
            return result.status(500).send(`Database error: ${SQLerror.message}`);
        }
        else {
            return result.status(200).send(`Successfully changed lighting setting.`);
        }
    })
}) 

// CHANGE EXPLICIT: takes a boolean and string, returns network status and message
app.post("/changeExplicit", (request, result) => {
    let {username, isExplicitRequest} = request.body;
    UserConnection.query(ChangeExplicitSQL, [isExplicitRequest, username], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return result.status(500).send(`Database error: ${SQLerror.message}`);
        } else {
            return result.status(200).send(`Successfully changed explicit settings.`);
        }
    })
})

//  HELPER FUNCTIONS
//REGEX CHECK: takes an array, returns a boolean
const SQL_REGEX = /["':;(){}|\/\\]/;
function checkRegex(listOfItems) {
    for(i = 0; i < listOfItems.length(); i++) {
        if(SQL_REGEX.test(listOfItems[i])){
            return true;
        }
    }
    return false;
}
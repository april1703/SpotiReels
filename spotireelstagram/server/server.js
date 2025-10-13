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

const UserLoginSQL = "SELECT password, salt FROM users WHERE username = ?";
const ExistingUserSQLCheck = "SELECT username FROM users WHERE username = ?";
const UserRegistrationSQL = "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)";
const UserPasswordREGEX = /["':;(){}|\/\\]/;

const app = express();
app.use(cors());
app.use(bodyParser.json());

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
        clientId: 'e9d0314470b945a4a27c5c708b06b775', //put your client id here
        clientSecret: '139bb072fba243d0a849744143a5539d', //put your client secret here
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

app.post("/register", (request, result) => {
    let {usernameInput, passwordInput} = request.body;
    if (UserPasswordREGEX.test(usernameInput) || UserPasswordREGEX.test(passwordInput)) {
        return result.status(400).send(new Error("Invalid characters in username or password"));
    }
    UserConnection.query(ExistingUserSQLCheck, [usernameInput], (SQLerror, SQLresults) =>{
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
    bcrypt.hash(newSalt + passwordInput + PEPPER, 12)
    .then(hashedPassword => {
        UserConnection.query(UserRegistrationSQL, [usernameInput, hashedPassword, newSalt], (SQLerror, SQLresults) => {
            if (SQLerror) {
            return result.status(500).send(`Database error: ${SQLerror}`);
            }
            return result.status(200).send(`User ${usernameInput} successfully created.`);
        })
    });
});

app.post("/register", (request, result) => {
    let {usernameInput, passwordInput} = request.body;
    if (UserPasswordREGEX.test(usernameInput) || UserPasswordREGEX.test(passwordInput)) {
        return result.status(400).send(new Error("Invalid characters in username or password"));
    }
    UserConnection.query(ExistingUserSQLCheck, [usernameInput], (SQLerror, SQLresults) =>{
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
    bcrypt.hash(newSalt + passwordInput + PEPPER, 12)
    .then(hashedPassword => {
        UserConnection.query(UserRegistrationSQL, [usernameInput, hashedPassword, newSalt], (SQLerror, SQLresults) => {
            if (SQLerror) {
            return result.status(500).send(`Database error: ${SQLerror}`);
            }
            return result.status(200).send(`User ${usernameInput} successfully created.`);
        })
    });
});

app.post("/login", (request, result) => {
    let {usernameInput, passwordInput} = request.body;
    if (UserPasswordREGEX.test(usernameInput) || UserPasswordREGEX.test(passwordInput)) {
        return result.status(400).send("Invalid characters in username or password");
    }
    UserConnection.query(UserLoginSQL, [usernameInput], (SQLerror, SQLresults) => {
        if (SQLerror) {
            return result.status(500).send(`Database error: ${SQLerror.message}`);
        }

        if (SQLresults.length === 0) {
            return result.status(404).send("User not found");
        }
        bcrypt.compare( SQLresults[0].salt + passwordInput + PEPPER, SQLresults[0].password)
        .then(isMatch => {
            if (isMatch) {
                return result.status(200).send(`Password success; user ${usernameInput} logged in`);
            } else {
                return result.status(403).send("Incorrect password.");
            }
        })
        .catch(bCryptError => {
            return result.status(500).send(`Server error: ${bCryptError.message}`);
        });
    });
});
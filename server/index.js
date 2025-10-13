require("dotenv").config();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const bodyparser = require("body-parser");
const cors = require("cors");
const express = require("express");
const spotifyAPI = require("spotify-web-api-node");

const PEPPER = String(process.env.PEPPER);
const SQL_HOST = String(process.env.MYSQL_HOST);
const SQL_USER = String(process.env.MYSQL_USER);
const SQL_PASSWORD = String(process.env.MYSQL_PASSWORD);

const UserLoginSQL = "SELECT password, salt FROM users WHERE username = ?";
const ExistingUserSQLCheck = "SELECT username FROM users WHERE username = ?";
const UserRegistrationSQL = "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)";
const UserPasswordREGEX = /["':;(){}|\/\\]/;

const app = express();
app.use(express.json());
app.use(cors({
    methods: ["GET", "POST"]
}));

const UserConnection = mysql.createConnection({
    host: SQL_HOST,
    user: SQL_USER,
    password: SQL_PASSWORD,
    database: "users",
});

// SQL startup health check
UserConnection.ping(err => {
  if (err) console.error("Ping failed:", err);
  else console.log("DB connection OK");
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

app.post("/register", (request, result) => {
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


//  PACKAGES
require("dotenv").config();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

//  ENVIRONMENT VARIABLES
const PEPPER = String(process.env.PEPPER);
const SQL_HOST = String(process.env.MYSQL_HOST);
const SQL_USER = String(process.env.MYSQL_USER);
const SQL_PASSWORD = String(process.env.MYSQL_PASSWORD);

//  OTHER CONSTANTS
const UserPasswordREGEX = /["':;(){}|\/\\]/;

//  SQL Connection
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

// SQL Regex Strings
const UserLoginSQL = "SELECT password, salt FROM users WHERE username = ?";
const UserRegistrationSQL = "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)";

// Login Function    
function login(usernameInput, passwordInput) {
    return new Promise((resolve, reject) => {

        // Validate input
        if (UserPasswordREGEX.test(usernameInput) || UserPasswordREGEX.test(passwordInput)) {
            return reject(new Error("Invalid characters in username or password"));
        }

        console.log(`Login attempt for user: "${usernameInput}"`);

        // Perform SQL query
        UserConnection.query(UserLoginSQL, [usernameInput], (SQLerror, SQLresults) => {
            if (SQLerror) {
                return reject(new Error("Database error: " + SQLerror.message));
            }

            if (SQLresults.length === 0) {
                return reject(new Error("User not found"));
            }

            console.log("Successful query. Checking password...");

            // Compare password
            bcrypt.compare( SQLresults[0].salt + passwordInput + PEPPER, SQLresults[0].password)
            .then(isMatch => {
                if (isMatch) {
                    return resolve(`Password successful; User \"${usernameInput}\" logged in`);
                } else {
                    return reject(new Error("Password failed. Incorrect password"));
                }
            })
            .catch(bCryptError => {
                return reject(new Error("BCrypt error: " + bCryptError.message));
            });
        });
    });
}

login("testuser", "password")
    .then(user => console.log("User found:", user))
    .catch(err => console.error("Login failed:", err.message));
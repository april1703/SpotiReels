//  PACKAGES
require("dotenv").config();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

//  ENVIRONMENT VARIABLE PROCESSING
const PEPPER = String(process.env.PEPPER);
const SQL_HOST = String(process.env.MYSQL_HOST);
const SQL_USER = String(process.env.MYSQL_USER);
const SQL_PASSWORD = String(process.env.MYSQL_PASSWORD);

//  SQL REGEX STRINGS
const UserLoginSQL = "SELECT password, salt FROM users WHERE username = ?";
const ExistingUserSQLCheck = "SELECT username FROM users WHERE username = ?";
const UserRegistrationSQL = "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)";

//  OTHER CONSTANTS
const UserPasswordREGEX = /["':;(){}|\/\\]/;

//  SQL CONNECTION
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

// REGISTRATION
function register(usernameInput, passwordInput) {
    return new Promise((resolve, reject) => {
        // Validate input
        if (UserPasswordREGEX.test(usernameInput) || UserPasswordREGEX.test(passwordInput)) {
            return reject(new Error("Invalid characters in username or password"));
        }
        console.log(`Registering new user \" ${usernameInput}\"...`);

        // Check if username has been taken
        UserConnection.query(ExistingUserSQLCheck, [usernameInput], (SQLerror, SQLresults) =>{
            if (SQLerror) {
                return reject(new Error("Database error: " + SQLerror.message));
            }

            if (SQLresults.length !== 0) {
                return reject(new Error("User already exists"));
            }
        })
        console.log("Successful query. Inserting new user...");

        // Create unique 12-byte salt and hash user password
        let newSalt = crypto.randomBytes(Math.ceil(12 / 2))
        .toString("hex")
        .slice(0, 12);

        bcrypt.hash(newSalt + passwordInput + PEPPER, 12)
        .then(hashedPassword => {
            UserConnection.query(UserRegistrationSQL, [usernameInput, hashedPassword, newSalt], (SQLerror, SQLresults) => {
                if (SQLerror) {
                return reject(new Error("Database error: " + SQLerror.message));
                }
                return resolve(`User account ${usernameInput} successfully created.`);
            })
        });
    })
}

// LOGIN  
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

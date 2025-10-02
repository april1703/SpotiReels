//      backend server code goes here (ie. handling requests n stuff)
//  PACKAGES
const dotenv = require("dotenv").configure();

//  ENVIRONMENT VARIABLES
const PEPPER = String(process.env.PEPPER);
const SQL_HOST = String(process.env.SQL_HOST);
const SQL_USER = String(process.env.SQL_USER);
const SQL_PASSWORD = String(process.env.SQL_PASSWORD);

//  OTHER CONSTANTS
// SQL Regex Strings
const UserLoginSQL = "SELECT password FROM users WHERE username = ?";
const UserRegistrationSQL = "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)";

function login(usernameInput, passwordInput) {
    console.log(`Login attempt for user: \"${usernameInput}\"`);

    // check if username/password is valid
    if (USERPASSWORDREGEX.test(usernameInput) || USERPASSWORDREGEX.test(passwordInput)){
        console.error("Invalid characters in username or password");
        return;
    }

}
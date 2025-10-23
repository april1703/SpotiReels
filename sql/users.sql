CREATE DATABASE account_information;

use account_information;

CREATE TABLE users (
    username VARCHAR(255) NOT NULL,
    spotifyUser VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password CHAR(60) NOT NULL,
    salt CHAR(12) NOT NULL,
    --isDarkMode BOOLEAN NOT NULL,
    --isExplicit BOOLEAN NOT NULL,
    PRIMARY KEY (username)
);

INSERT INTO users
VALUES(
    "testuser1",
    "spotifyUserTest",
    "email@testemail.com",
    -- password is "password"; pepper is "basicpepper123"; salt is "basicsalt123"
    "$2b$12$iE0iYgAs47Z/ROtJlzzOWeoFCE4nvHBFrudSTEicDbuuVCNmo4yBy",
    "basicsalt123",
    TRUE,
    TRUE
);

INSERT INTO users
VALUES(
    "testuser2",
    "spotifyUserTest2",
    "email2@testemail.com",
    -- password is "password"; pepper is "basicpepper123"; salt is "basicsalt123"
    "$2b$12$iE0iYgAs47Z/ROtJlzzOWeoFCE4nvHBFrudSTEicDbuuVCNmo4yBy",
    "basicsalt123",
    TRUE,
    TRUE
);

CREATE TABLE following (
    username VARCHAR(50) NOT NULL,
    user_following VARCHAR(50) NOT NULL,
    PRIMARY KEY (username, user_following),
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (user_following) REFERENCES users(username)
);

INSERT INTO following (username, user_following)
VALUES
    ("testuser1","testuser2"),
    ("testuser2","testuser1");
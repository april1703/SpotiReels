CREATE DATABASE spottireels;
USE spottireels;

-- USERS TABLE
CREATE TABLE users (
    username VARCHAR(50) NOT NULL,
    password CHAR(60) NOT NULL,
    salt CHAR(12) NOT NULL,
    isDarkMode BOOLEAN NOT NULL,
    isExplicit BOOLEAN NOT NULL,
    PRIMARY KEY (username)
);

-- FOLLOWING TABLE
CREATE TABLE following (
    username VARCHAR(50) NOT NULL,
    user_following VARCHAR(50) NOT NULL,
    PRIMARY KEY (username, user_following),
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (user_following) REFERENCES users(username)
);

-- PLAYLIST NAMES TABLE
CREATE TABLE playlist_names (
    username VARCHAR(50) NOT NULL,
    list_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (username, list_name),
    FOREIGN KEY (username) REFERENCES users(username)
);

-- PLAYLIST CONTENTS TABLE
CREATE TABLE playlist_contents (
    username VARCHAR(50) NOT NULL,
    list_name VARCHAR(100) NOT NULL,
    song VARCHAR(255) NOT NULL,
    PRIMARY KEY (username, list_name, song),
    FOREIGN KEY (username, list_name)
        REFERENCES playlist_names(username, list_name)
);

-- LIKED SONGS TABLE
CREATE TABLE liked_songs (
    username VARCHAR(50) NOT NULL,
    song VARCHAR (255) NOT NULL,
    PRIMARY KEY (username),
    FOREIGN KEY (username) REFERENCES users(username)
)

-- FOR DEBUGGING PURPOSES ONLY, WILL BE REMOVED LATER
INSERT INTO users VALUES
("testuser1",
 "$2b$12$iE0iYgAs47Z/ROtJlzzOWeoFCE4nvHBFrudSTEicDbuuVCNmo4yBy",
 "basicsalt123", TRUE, TRUE),
("testuser2",
 "$2b$12$iE0iYgAs47Z/ROtJlzzOWeoFCE4nvHBFrudSTEicDbuuVCNmo4yBy",
 "basicsalt123", TRUE, TRUE);

INSERT INTO following (username, user_following) VALUES
("testuser1", "testuser2"),
("testuser2", "testuser1");
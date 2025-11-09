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
);

-- POSTS TABLE
CREATE TABLE posts (
    post_ID CHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    song VARCHAR(256) NOT NULL,
    body TEXT NOT NULL,
    time_stamp VARCHAR(256) NOT NULL,
    PRIMARY KEY (post_ID),
    FOREIGN KEY (username) REFERENCES users(username)
);

-- REACTIONS TABLE
CREATE TABLE reactions (
    post_ID CHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    PRIMARY KEY (post_ID, username),
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (post_ID) REFERENCES posts(post_id)
)
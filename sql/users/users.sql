CREATE DATABASE users;

use users;

CREATE TABLE users (
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    salt CHAR(12) NOT NULL,
    PRIMARY KEY (username)
);

INSERT INTO users
VALUES(
    "testuser",
    "hashTBD",
    "basicsalt123"
)
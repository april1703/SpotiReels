CREATE DATABASE users;

use users;

CREATE TABLE users (
    username VARCHAR(255) NOT NULL,
    password CHAR(60) NOT NULL,
    salt CHAR(12) NOT NULL,
    PRIMARY KEY (username)
);

INSERT INTO users
VALUES(
    "testuser",
    -- password is "password"; pepper is "basicpepper123"; salt is "basicsalt123"
    "$2b$12$iE0iYgAs47Z/ROtJlzzOWeoFCE4nvHBFrudSTEicDbuuVCNmo4yBy",
    "basicsalt123"
);
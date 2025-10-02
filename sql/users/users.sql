CREATE DATABASE users;

use users;

CREATE TABLE users (
    username VARCHAR(255) NOT NULL,
    password CHAR(32) NOT NULL,
    salt CHAR(12) NOT NULL,
    PRIMARY KEY (username)
);

INSERT INTO users
VALUES(
    "testuser",
    -- password is "password"; pepper is "basicpepper123"; salt is "basicsalt123"
    "4a3707d6f5ec1e2d4b7365220e4020f10d326c0ee432e774a89c9b94eabafd6f",
    "basicsalt123"
)
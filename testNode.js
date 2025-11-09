// test-db-connection.js
import mysql from "mysql2";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

// Create the connection
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

// Try to connect and ping
connection.connect(err => {
  if (err) {
    console.error("❌ Connection failed:");
    console.error("Error code:", err.code);
    console.error("Message:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Connected to MySQL!");
    connection.ping(pingErr => {
      if (pingErr) {
        console.error("❌ Ping failed:", pingErr.message);
      } else {
        console.log("✅ Ping OK — database is reachable.");
      }
      connection.end();
    });
  }
});
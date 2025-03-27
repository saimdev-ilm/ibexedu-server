const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
dotenv.config({path:'./config.env'});

const DB_PATH = process.env.DATABASE;
console.log(DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DATABASE NOT CONNECTED", err.message);
  } else {
    console.log("DB CONNECTED");
  }
});


function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error("Error closing database", err.message);
    } else {
      console.log("Database connection closed");
    }
  });
}

module.exports = { db, closeDatabase };




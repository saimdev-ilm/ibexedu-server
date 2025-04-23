const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const { promisify } = require('util');

dotenv.config({path:'./config.env'});

const DB_PATH = process.env.DATABASE;
console.log(DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DATABASE NOT CONNECTED", err.message);
  } else {
    console.log("DB CONNECTED");
    
    // Initialize required tables
    initializeTables();
  }
});

// Initialize tables required for the application
function initializeTables() {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON', function(err) {
    if (err) {
      console.error("Error enabling foreign keys:", err.message);
    }
  });

  // Create jobs table if not exists
  const createJobsTable = `
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT,
      position_type TEXT,
      work_type TEXT,
      designation_name TEXT,
      posted_date TEXT,
      posted_time TEXT,
      general_details TEXT,
      responsibilities TEXT,
      requirements TEXT,
      benefits TEXT,
      salary_price INTEGER,
      salary_unit TEXT,
      salary_show INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create applied_jobs table if not exists
  const createAppliedJobsTable = `
    CREATE TABLE IF NOT EXISTS applied_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      first_name TEXT,
      last_name TEXT,
      resume_path TEXT,
      resume_original_name TEXT,
      cover_letter TEXT,
      email TEXT,
      phone_number TEXT,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `;

  // Execute table creation
  db.serialize(() => {
    db.run(createJobsTable, function(err) {
      if (err) {
        console.error("Error creating jobs table:", err.message);
      } else {
        console.log("Jobs table initialized");
      }
    });

    db.run(createAppliedJobsTable, function(err) {
      if (err) {
        console.error("Error creating applied_jobs table:", err.message);
      } else {
        console.log("Applied_jobs table initialized");
      }
    });
  });
}

// Helper function to run a SQL query as a Promise
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Helper function to get multiple rows as a Promise
const getQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

// Helper function to get a single row as a Promise
const getOneQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};

function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error("Error closing database", err.message);
    } else {
      console.log("Database connection closed");
    }
  });
}

module.exports = {
  db,
  closeDatabase,
  runQuery,
  getQuery,
  getOneQuery
};
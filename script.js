const fetch = require('node-fetch').default;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'config.env') });

const API_URL = 'http://localhost:5000/api/sync-courses';
const SYNC_INTERVAL = 60 * 1000;
const MAX_START_VALUE = 2700;
const LIMIT = 100;

async function syncCourses(startValue) {
  try {
    const response = await fetch(`${API_URL}?limit=${LIMIT}&start=${startValue}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Sync at start ${startValue}:`, data.message);
    return data.courses.length > 0;
  } catch (error) {
    console.error('Sync error:', error.message);
    return false;
  }
}

async function runCourseSyncCycle() {
  let currentStart = 0;
  
  while (currentStart <= MAX_START_VALUE) {
    console.log(`Starting sync cycle for start value: ${currentStart}`);
    
    const hasMoreCourses = await syncCourses(currentStart);
    
    if (!hasMoreCourses) {
      console.log('No more courses to sync. Stopping sync cycle.');
      break;
    }

    await new Promise(resolve => setTimeout(resolve, SYNC_INTERVAL));
    
    currentStart += LIMIT;
  }

  console.log('Course sync cycle completed.');
}

// Start the sync cycle
runCourseSyncCycle().catch(console.error);
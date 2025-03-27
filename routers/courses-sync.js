const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { db } = require("../db/conn");

dotenv.config({ path: "./config.env" });
const apiKey = process.env.APIKEY;

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

async function ensureDirectoryExists(directory) {
  try {
    await mkdirAsync(directory, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error creating directory:', error);
    }
  }
}

async function downloadImage(imageUrl, courseId) {
  try {
    const imagesDir = path.join(__dirname, '..', 'assets', 'courses_images');
    await ensureDirectoryExists(imagesDir);

    // Remove query parameters from the URL
    const cleanImageUrl = imageUrl.split('?')[0];

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.buffer();
    const fileExtension = path.extname(cleanImageUrl) || '.png';
    const localFileName = `${courseId}${fileExtension}`;
    const localFilePath = path.join(imagesDir, localFileName);

    await writeFileAsync(localFilePath, imageBuffer);

    return path.join('assets', 'courses_images', localFileName);
  } catch (error) {
    console.error(`Error downloading image for course ${courseId}:`, error);
    return null;
  }
}

function createCoursesTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      original_id INTEGER,
      code TEXT,
      name TEXT,
      description TEXT,
      course_code_for_bulk_import TEXT,
      active BOOLEAN,
      include_in_library BOOLEAN,
      complete_in_order BOOLEAN,
      image_path TEXT,
      created_date TEXT,
      updated_date TEXT,
      created_by TEXT,
      updated_by TEXT,
      for_sale BOOLEAN,
      price REAL,
      languages TEXT,
      topics TEXT,
      tags TEXT,
      skills TEXT
    )
  `;

  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating courses table:', err);
    } else {
      console.log('Courses table ensured');
    }
  });
}

createCoursesTable();

function filterResponse(data) {
  const replacelitmos = (obj) => {
    if (typeof obj === "string") {
      return obj.replace(/Litmos/g, "ibexEdu").replace(/litmos/g, "ibexEdu");
    }

    if (Array.isArray(obj)) {
      return obj.map(replacelitmos).filter((item) => {
        if (typeof item === "object" && item !== null) {
          const title = item.Name?.toLowerCase() || "";
          const description = item.Description?.toLowerCase() || "";
          return (
            !title.includes("que") &&
            !title.includes("qué") &&
            !title.includes("Qué") &&
            !title.includes("do") &&
            !title.includes("de") &&
            !title.includes("se") &&
            !description.includes("que") &&
            !description.includes("qué") &&
            !description.includes("Qué")
          );
        }
        return true;
      });
    }

    if (typeof obj === "object" && obj !== null) {
      return Object.keys(obj).reduce((acc, key) => {
        const value = replacelitmos(obj[key]);
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }

    return obj;
  };

  return replacelitmos(data);
}

/**
 * @swagger
 * /api/sync-courses:
 *   get:
 *     tags:
 *       - Courses Sync
 *     summary: Synchronize Courses
 *     description: Fetch all courses and their details, store in database
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         required: false
 *         description: Number of courses to sync
 *       - in: query
 *         name: start
 *         schema:
 *           type: integer
 *           default: 0
 *         required: false
 *         description: starting index of list to sync
 *     responses:
 *       200:
 *         description: Successfully synchronized courses
 *       500:
 *         description: Error synchronizing courses
 */
router.get("/api/sync-courses", async (req, res) => {
  const { limit = 50, start = 0 } = req.query;
  
  try {
    const coursesResponse = await fetch(
      `https://api.litmos.com/v1.svc/courses?source=node_server&format=json&limit=${limit}&start=${start}`,
      {
        method: "GET",
        headers: {
          apikey: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!coursesResponse.ok) {
      throw new Error(`HTTP error! status: ${coursesResponse.status}`);
    }

    const courses = await coursesResponse.json();
    const processedCourses = await Promise.all(
      courses.map(async (course) => {
        try {
          const detailsResponse = await fetch(
            `https://api.litmos.com/v1.svc/courses/${course.Id}/details?source=node_server&format=json`,
            {
              method: "GET",
              headers: {
                apikey: apiKey,
                Accept: "application/json",
              },
            }
          );

          if (!detailsResponse.ok) {
            console.error(`Failed to fetch details for course ${course.Id}`);
            return null;
          }

          const courseDetails = await detailsResponse.json();

          // Apply filtering to course details
          const filteredCourseDetails = filterResponse(courseDetails);

          let imagePath = null;
          if (filteredCourseDetails.CourseImageURL) {
            imagePath = await downloadImage(filteredCourseDetails.CourseImageURL, filteredCourseDetails.Id);
          }

          return {
            id: filteredCourseDetails.Id,
            original_id: filteredCourseDetails.OriginalId,
            code: filteredCourseDetails.Code,
            name: filteredCourseDetails.Name,
            description: filteredCourseDetails.Description,
            course_code_for_bulk_import: filteredCourseDetails.CourseCodeForBulkImport,
            active: filteredCourseDetails.Active ? 1 : 0,
            include_in_library: filteredCourseDetails.IncludeInLibrary ? 1 : 0,
            complete_in_order: filteredCourseDetails.CompleteInOrder ? 1 : 0,
            image_path: imagePath,
            created_date: filteredCourseDetails.CreatedDate,
            updated_date: filteredCourseDetails.UpdatedDate,
            created_by: filteredCourseDetails.CreatedBy,
            updated_by: filteredCourseDetails.UpdatedBy,
            for_sale: filteredCourseDetails.ForSale ? 1 : 0,
            price: filteredCourseDetails.Price,
            languages: JSON.stringify(filteredCourseDetails.Languages || []),
            topics: JSON.stringify(filteredCourseDetails.Topics || []),
            tags: JSON.stringify(filteredCourseDetails.Tags || []),
            skills: JSON.stringify(filteredCourseDetails.Skills || [])
          };
        } catch (courseError) {
          console.error(`Error processing course ${course.Id}:`, courseError);
          return null;
        }
      })
    );

    const validCourses = processedCourses.filter(course => course !== null);

    const insertOrUpdateQuery = `
      INSERT OR REPLACE INTO courses (
        id, original_id, code, name, description, course_code_for_bulk_import,
        active, include_in_library, complete_in_order, image_path,
        created_date, updated_date, created_by, updated_by,
        for_sale, price, languages, topics, tags, skills
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const stmt = db.prepare(insertOrUpdateQuery);
      validCourses.forEach(course => {
        stmt.run([
          course.id, course.original_id, course.code, course.name, 
          course.description, course.course_code_for_bulk_import,
          course.active, course.include_in_library, course.complete_in_order, 
          course.image_path, course.created_date, course.updated_date, 
          course.created_by, course.updated_by, course.for_sale, 
          course.price, course.languages, course.topics, 
          course.tags, course.skills
        ]);
      });
      
      stmt.finalize();
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('Transaction commit error:', err);
        }
      });
    });

    res.json({
      message: `Successfully synchronized ${validCourses.length} courses`,
      courses: validCourses.map(course => ({
        id: course.id,
        name: course.name
      }))
    });

  } catch (error) {
    console.error("Error synchronizing courses:", error);
    res.status(500).json({
      error: "Failed to synchronize courses",
      details: error.message,
    });
  }
});

module.exports = router;
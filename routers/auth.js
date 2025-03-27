const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const { db } = require("../db/conn");
const apiKey = process.env.APIKEY;

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
 * tags:
 *   - name: Courses
 *     description: Operations related to Courses
 *   - name: Collections
 *     description: Operations related to Collections
 *
 * /api/courses/:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get Courses
 *     description: Retrieve a list of courses from API
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           default: node_server
 *         required: false
 *         description: Source of the courses
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           default: json
 *         required: false
 *         description: Response format
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         required: false
 *         description: Number of courses to retrieve
 *       - in: query
 *         name: start
 *         schema:
 *           type: integer
 *           default: 0
 *         required: false
 *         description: Start number of retrieval
 *     responses:
 *       200:
 *         description: Successfully retrieved courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *       500:
 *         description: Error fetching courses
 */
router.get("/api/courses/", async (req, res) => {
  const {
    source = "node_server",
    format = "json",
    limit = 5,
    start = 0,
  } = req.query;
  console.log(req.query);
  try {
    const response = await fetch(
      `https://api.litmos.com/v1.svc/courses?source=${source}&format=${format}&limit=${limit}&start=${start}`,
      {
        method: "GET",
        headers: {
          apikey: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const filteredResult = filterResponse(result);
    res.json(filteredResult);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      error: "Failed to fetch courses",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/courses/search:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Search Courses
 *     description: Search courses in API with optional parameters
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           default: node_server
 *         required: false
 *         description: Source of the courses
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           default: json
 *         required: false
 *         description: Response format
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         required: false
 *         description: Number of courses to retrieve
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           default: belt
 *         required: false
 *         description: Search term for courses
 *     responses:
 *       200:
 *         description: Successfully retrieved courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *       500:
 *         description: Error fetching courses
 */
router.get("/api/courses/search", async (req, res) => {
  const {
    source = "node_server",
    format = "json",
    limit = 5,
    search = "belt",
  } = req.query;

  try {
    const response = await fetch(
      `https://api.litmos.com/v1.svc/courses?source=${source}&format=${format}&limit=${limit}&search=${search}`,
      {
        method: "GET",
        headers: {
          apikey: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    const filteredResult = filterResponse(result);
    res.json(filteredResult);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      error: "Failed to fetch courses",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/details:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get Course Details
 *     description: Retrieve detailed information for a specific course by its ID
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the course
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           default: node_server
 *         required: false
 *         description: Source of the course
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           default: json
 *         required: false
 *         description: Response format
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         required: false
 *         description: Number of details to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved course details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *       401:
 *         description: Unauthorized due to Litmos branding in course image
 *       404:
 *         description: Course not found
 *       500:
 *         description: Error fetching course details
 */
router.get("/api/courses/:courseId/details", async (req, res) => {
  const { courseId } = req.params;

  const { source = "node_server", format = "json", limit = 5 } = req.query;

  try {
    const response = await fetch(
      `https://api.litmos.com/v1.svc/courses/${courseId}/details?source=${source}&format=${format}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          apikey: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          error: "Course not found",
          courseId: courseId,
        });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(result);
    // if(result.CourseImageURL){
    //   const imageUrl = result.CourseImageURL;
    //   console.log("IMAGE", imageUrl)
    //   try {
    //     tesseract
    //       .recognize(imageUrl, config)
    //       .then((text) => {
    //         console.log('OCR Result:', text);
    //         res.status(401).send('Litmos word in image');
    //       })
    //       .catch((error) => {
    //         console.error('OCR Error:', error.message);
    //         res.status(500).send('Error processing the image.');
    //       });
    //   } catch (error) {
    //     console.error('Error:', error.message);
    //     res.status(500).send('An error occurred while processing the image.');
    //   }
    // }
    const filteredResult = filterResponse(result);
    res.json(filteredResult);
  } catch (error) {
    console.error("Error fetching course details:", error);
    res.status(500).json({
      error: "Failed to fetch course details",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/ibexedu/courses:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get IbexEdu Courses
 *     description: Retrieve a list of courses from the database with pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Number of courses to retrieve
 *       - in: query
 *         name: start
 *         schema:
 *           type: integer
 *           default: 0
 *         required: false
 *         description: Starting index for retrieving courses
 *     responses:
 *       200:
 *         description: Successfully retrieved courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_courses:
 *                   type: integer
 *                 courses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       description:
 *                         type: string
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Error retrieving courses
 */
router.get("/api/ibexedu/courses", async (req, res) => {
  const { 
    limit = 10, 
    start = 0
  } = req.query;

  try {
    // Validate input parameters
    const parsedLimit = parseInt(limit, 10);
    const parsedStart = parseInt(start, 10);

    if (isNaN(parsedLimit) || isNaN(parsedStart)) {
      return res.status(400).json({
        error: "Invalid limit or start parameter"
      });
    }

    // Count total courses for the query
    const countQuery = "SELECT COUNT(*) as total FROM courses";
    const totalResult = await new Promise((resolve, reject) => {
      db.get(countQuery, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const totalCourses = totalResult.total;

    // Adjust start and limit to prevent out-of-bounds requests
    const adjustedStart = Math.min(Math.max(parsedStart, 0), totalCourses);
    const adjustedLimit = Math.min(parsedLimit, totalCourses - adjustedStart);

    // If adjusted limit is 0, return an empty array
    if (adjustedLimit <= 0) {
      return res.json({
        total_courses: totalCourses,
        courses: []
      });
    }

    // Construct base query to select all columns
    let query = `
      SELECT 
        id, 
        original_id, 
        code, 
        name, 
        description, 
        course_code_for_bulk_import,
        active, 
        include_in_library, 
        complete_in_order, 
        image_path,
        created_date, 
        updated_date, 
        created_by, 
        updated_by,
        for_sale, 
        price, 
        languages, 
        topics, 
        tags, 
        skills 
      FROM courses 
      ORDER BY name ASC 
      LIMIT ? OFFSET ?
    `;
    const params = [adjustedLimit, adjustedStart];

    // Execute main query
    const courses = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Process the courses to parse JSON fields and create full image URLs
    const processedCourses = courses.map(course => {
      // Parse JSON fields
      const parsedCourse = {
        ...course,
        languages: JSON.parse(course.languages || '[]'),
        topics: JSON.parse(course.topics || '[]'),
        tags: JSON.parse(course.tags || '[]'),
        skills: JSON.parse(course.skills || '[]'),
        active: !!course.active,
        include_in_library: !!course.include_in_library,
        for_sale: !!course.for_sale,
        complete_in_order: !!course.complete_in_order
      };

      // Create full image URL if image_path exists
      if (course.image_path) {
        // Normalize the path and remove any leading 'assets/' or backslashes
        const normalizedPath = course.image_path
          .replace(/^assets[/\\]/, '')  // Remove leading 'assets/' or 'assets\'
          .replace(/^[/\\]/, '')        // Remove leading slash or backslash
          .replace(/\\/g, '/');         // Replace backslashes with forward slashes

        // Create full image URL
        parsedCourse.full_image_url = `${req.protocol}://${req.get('host')}/assets/${normalizedPath}`;
      }

      return parsedCourse;
    });

    res.json({
      total_courses: totalCourses,
      courses: processedCourses,
      start: adjustedStart,
      limit: adjustedLimit
    });

  } catch (error) {
    console.error("Error retrieving courses:", error);
    res.status(500).json({
      error: "Failed to retrieve courses",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/collections:
 *   get:
 *     tags:
 *       - Collections
 *     summary: Get Collections
 *     description: Retrieve a list of collections from API
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           default: node_server
 *         required: false
 *         description: Source of the collections
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           default: json
 *         required: false
 *         description: Response format
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Number of collections to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved collections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *       500:
 *         description: Error fetching collections
 */
router.get("/api/collections", async (req, res) => {
  const { source = "node_server", format = "json", limit = 10 } = req.query;

  try {
    const response = await fetch(
      `https://api.litmos.com/v1.svc/collections?source=${source}&format=${format}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          apikey: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const filteredResult = filterResponse(result);
    res.json(filteredResult);
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({
      error: "Failed to fetch collections",
      details: error.message,
    });
  }
});

module.exports = router;

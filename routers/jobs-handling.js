const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { db } = require("../db/conn");
const { v4: uuidv4 } = require('uuid');

// Create async versions of file system functions
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

// Set up file storage for resume uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/resumes");
    try {
      // Create directory if it doesn't exist
      await mkdirAsync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        cb(error);
      } else {
        cb(null, uploadDir);
      }
    }
  },
  filename: function (req, file, cb) {
    const firstName = req.body.firstName || 'applicant';
    const lastName = req.body.lastName || '';
    const jobId = req.body.jobId || 'job';
    const uniqueId = uuidv4().substring(0, 8);
    const ext = path.extname(file.originalname);
    
    // Create a filename with firstName_lastName_jobId_uniqueId.extension
    const cleanFileName = `${firstName.replace(/[^a-z0-9]/gi, '_')}_${lastName.replace(/[^a-z0-9]/gi, '_')}_${jobId}_${uniqueId}${ext}`.toLowerCase();
    cb(null, cleanFileName);
  }
});

// File filter to restrict to PDF, DOC, DOCX
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".pdf", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, DOC, or DOCX files are allowed."), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Helper function to determine file content type
const getFileContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  switch(ext) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
};

// Setup for email sending
const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const senderEmail = process.env.SENDER_EMAIL;
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
require("isomorphic-fetch");

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

const client = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken(
        "https://graph.microsoft.com/.default"
      );
      return token.token;
    },
  },
});

// Email template for job application admin notification
const createJobApplicationAdminEmailTemplate = (formData, jobData) => {
  const resumeInfo = formData.resumePath 
    ? `<div class="detail-row">
        <div class="detail-label">Resume:</div>
        <div class="detail-value">
          <strong>${formData.resumeOriginalName}</strong> (attached to this email)
        </div>
      </div>`
    : `<div class="detail-row">
        <div class="detail-label">Resume:</div>
        <div class="detail-value"><em>No resume provided</em></div>
      </div>`;

  return `
    <div class="contact-details">
      <div class="section-title">Job Application Information</div>
      <div class="detail-row">
        <div class="detail-label">Position:</div>
        <div class="detail-value">${jobData.designation_name}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Name:</div>
        <div class="detail-value">${formData.firstName} ${formData.lastName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Email:</div>
        <div class="detail-value">${formData.email}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Phone:</div>
        <div class="detail-value">${formData.phoneNumber}</div>
      </div>
      ${resumeInfo}
    </div>
    
    <div class="message-box">
      <div class="section-title">Cover Letter</div>
      <div class="message-content">
        ${formData.coverLetter ? formData.coverLetter.replace(/\n/g, '<br>') : '<em>No cover letter provided</em>'}
      </div>
    </div>
  `;
};

// Email template for job application user confirmation
const createJobApplicationUserEmailTemplate = (formData, jobData) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Job Application Received - ibexVision</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      
      body {
        font-family: 'Poppins', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 650px;
        margin: 0 auto;
        padding: 0;
        background-color: #f4f7f9;
      }
      
      .email-container {
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        margin: 20px 0;
        background-color: #ffffff;
      }
      
      .email-header {
        background: #1a5276;
        color: white;
        padding: 30px 20px;
        text-align: center;
        position: relative;
      }
      
      .email-header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      
      .thank-you-icon {
        font-size: 40px;
        margin: 15px 0;
        display: block;
      }
      
      .email-body {
        padding: 35px 25px;
        text-align: center;
      }
      
      .greeting {
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 20px;
        color: #2c3e50;
      }
      
      .message {
        font-size: 16px;
        line-height: 1.8;
        margin-bottom: 30px;
        color: #555;
      }
      
      .job-details {
        background-color: #f0f7fb;
        border-left: 4px solid #3498db;
        padding: 15px;
        margin: 25px 0;
        text-align: left;
        border-radius: 5px;
      }
      
      .divider {
        height: 1px;
        background-color: #eaeaea;
        margin: 30px 0;
      }
      
      .contact-info {
        text-align: center;
        margin-top: 25px;
        font-size: 14px;
        color: #666;
      }
      
      .email-footer {
        background-color: #f4f7f9;
        padding: 20px 15px;
        text-align: center;
        font-size: 13px;
        color: #666;
        border-top: 1px solid #eaeaea;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>ibexVision</h1>
        <span class="thank-you-icon">✓</span>
      </div>
      <div class="email-body">
        <div class="greeting">Thank You, ${formData.firstName} ${formData.lastName}!</div>
        
        <div class="message">
          Thank you for applying to ibexVision! We have received your application and our recruitment team will review it shortly. We appreciate your interest in joining our team.
        </div>
        
        <div class="job-details">
          <p><strong>Position:</strong> ${jobData.designation_name}</p>
          <p><strong>Location:</strong> ${jobData.location}</p>
          <p><strong>Work Type:</strong> ${jobData.work_type}</p>
          <p><strong>Position Type:</strong> ${jobData.position_type}</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="contact-info">
          <p>If you have any questions about your application, please contact us at:</p>
          <p><strong>Email:</strong> jobs@ibexvision.ai</p>
        </div>
      </div>
      <div class="email-footer">
        <p>© ${new Date().getFullYear()} ibexVision. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Function to send job application emails
const sendJobApplicationEmails = async (formData, jobData) => {
  try {
    const recipientEmail = 'jobs@ibexvision.ai';
    const adminHtmlContent = createJobApplicationAdminEmailTemplate(formData, jobData);
    const userHtmlContent = createJobApplicationUserEmailTemplate(formData, jobData);
    
    // Create attachment if resume exists
    let attachments = [];
    if (formData.resumePath) {
      try {
        // Read the file as base64
        const fileContent = fs.readFileSync(formData.resumePath);
        const base64Content = Buffer.from(fileContent).toString('base64');
        
        // Create the attachment
        attachments.push({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: formData.resumeFileName,
          contentType: getFileContentType(formData.resumeFileName),
          contentBytes: base64Content
        });
      } catch (fileError) {
        console.error('Error attaching resume file:', fileError);
        // Continue even if file attachment fails
      }
    }

    // Send the admin notification email with attachment
    await client.api(`/users/${senderEmail}/sendMail`).post({
      message: {
        subject: `New Job Application - ${jobData.designation_name} - ${formData.firstName} ${formData.lastName}`,
        body: {
          contentType: "HTML",
          content: adminHtmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipientEmail,
            },
          },
        ],
        attachments: attachments
      },
    });

    // Send confirmation email to the applicant (without resume attachment)
    await client.api(`/users/${senderEmail}/sendMail`).post({
      message: {
        subject: `Job Application Received - ibexVision`,
        body: {
          contentType: "HTML",
          content: userHtmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: formData.email,
            },
          },
        ],
      },
    });

    console.log(`Job application emails sent successfully. Admin email with resume sent to ${recipientEmail} and confirmation email sent to ${formData.email}`);
    return true;
  } catch (error) {
    console.error('Error sending job application emails:', error);
    throw error;
  }
};

// Helper function to run database queries as promises
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Helper function to get results from database
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

// Helper function to get a single row from database
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

// Create jobs table if not exists
const createJobsTable = async () => {
  const createJobsTableQuery = `
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

  try {
    await runQuery(createJobsTableQuery);
    console.log('Jobs table ensured');
  } catch (err) {
    console.error('Error creating jobs table:', err);
  }
};

// Create applied_jobs table if not exists
const createAppliedJobsTable = async () => {
  const createAppliedJobsTableQuery = `
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

  try {
    await runQuery(createAppliedJobsTableQuery);
    console.log('Applied jobs table ensured');
  } catch (err) {
    console.error('Error creating applied_jobs table:', err);
  }
};

// Initialize tables
(async () => {
  await createJobsTable();
  await createAppliedJobsTable();
})();

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Create New Job
 *     description: Create a new job posting
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: string
 *                 description: Job location
 *               position_type:
 *                 type: string
 *                 description: Type of position (Full-time, Part-time, etc.)
 *               work_type:
 *                 type: string
 *                 description: Work type (Remote, On-site, Hybrid)
 *               designation_name:
 *                 type: string
 *                 description: Job title or designation
 *               general_details:
 *                 type: string
 *                 description: General description of the job
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of job responsibilities
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of job requirements
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of job benefits
 *               salary_price:
 *                 type: integer
 *                 description: Salary amount
 *               salary_unit:
 *                 type: string
 *                 description: Salary unit (yearly, monthly, etc.)
 *               salary_show:
 *                 type: boolean
 *                 description: Whether to show salary information
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/jobs", async (req, res) => {
  try {
    const {
      location,
      position_type,
      work_type,
      designation_name,
      general_details,
      responsibilities,
      requirements,
      benefits,
      salary_price,
      salary_unit,
      salary_show
    } = req.body;

    // Validate required fields
    if (!location || !position_type || !work_type || !designation_name || !general_details) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["location", "position_type", "work_type", "designation_name", "general_details"]
      });
    }

    // Format arrays as JSON strings
    const responsibilitiesJson = JSON.stringify(responsibilities || []);
    const requirementsJson = JSON.stringify(requirements || []);
    const benefitsJson = JSON.stringify(benefits || []);

    // Get current date and time for posted_date and posted_time
    const now = new Date();
    const posted_date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const posted_time = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const insertJobQuery = `
      INSERT INTO jobs (
        location, position_type, work_type, designation_name,
        posted_date, posted_time, general_details,
        responsibilities, requirements, benefits,
        salary_price, salary_unit, salary_show
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await runQuery(insertJobQuery, [
      location,
      position_type,
      work_type,
      designation_name,
      posted_date,
      posted_time,
      general_details,
      responsibilitiesJson,
      requirementsJson,
      benefitsJson,
      salary_price || null,
      salary_unit || null,
      salary_show ? 1 : 0
    ]);

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job_id: result.id
    });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({
      error: "Failed to create job",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: Get All Jobs
 *     description: Retrieve a list of all job postings
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of jobs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of jobs to skip
 *     responses:
 *       200:
 *         description: List of jobs retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/api/jobs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const getJobsQuery = `
      SELECT * FROM jobs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const getJobsCountQuery = `SELECT COUNT(*) as total FROM jobs`;

    const jobs = await getQuery(getJobsQuery, [limit, offset]);
    const countResult = await getOneQuery(getJobsCountQuery);
    
    // Parse JSON strings back to arrays
    const formattedJobs = jobs.map(job => ({
      ...job,
      responsibilities: JSON.parse(job.responsibilities || '[]'),
      requirements: JSON.parse(job.requirements || '[]'),
      benefits: JSON.parse(job.benefits || '[]'),
      salary_show: job.salary_show === 1
    }));

    res.status(200).json({
      success: true,
      total: countResult.total,
      jobs: formattedJobs
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({
      error: "Failed to fetch jobs",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: Get Job by ID
 *     description: Retrieve a specific job by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the job to retrieve
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.get("/api/jobs/:id", async (req, res) => {
  try {
    const jobId = req.params.id;
    
    const getJobQuery = `SELECT * FROM jobs WHERE id = ?`;
    const job = await getOneQuery(getJobQuery, [jobId]);
    
    if (!job) {
      return res.status(404).json({
        error: "Job not found"
      });
    }
    
    // Parse JSON strings back to arrays
    const formattedJob = {
      ...job,
      responsibilities: JSON.parse(job.responsibilities || '[]'),
      requirements: JSON.parse(job.requirements || '[]'),
      benefits: JSON.parse(job.benefits || '[]'),
      salary_show: job.salary_show === 1
    };

    res.status(200).json({
      success: true,
      job: formattedJob
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({
      error: "Failed to fetch job",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     tags:
 *       - Jobs
 *     summary: Update Job
 *     description: Update an existing job posting
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the job to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: string
 *               position_type:
 *                 type: string
 *               work_type:
 *                 type: string
 *               designation_name:
 *                 type: string
 *               general_details:
 *                 type: string
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: string
 *               salary_price:
 *                 type: integer
 *               salary_unit:
 *                 type: string
 *               salary_show:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.put("/api/jobs/:id", async (req, res) => {
  try {
    const jobId = req.params.id;
    const {
      location,
      position_type,
      work_type,
      designation_name,
      general_details,
      responsibilities,
      requirements,
      benefits,
      salary_price,
      salary_unit,
      salary_show
    } = req.body;

    // Check if job exists
    const checkJobQuery = `SELECT id FROM jobs WHERE id = ?`;
    const existingJob = await getOneQuery(checkJobQuery, [jobId]);
    
    if (!existingJob) {
      return res.status(404).json({
        error: "Job not found"
      });
    }

    // Format arrays as JSON strings
    const responsibilitiesJson = responsibilities ? JSON.stringify(responsibilities) : undefined;
    const requirementsJson = requirements ? JSON.stringify(requirements) : undefined;
    const benefitsJson = benefits ? JSON.stringify(benefits) : undefined;

    // Build dynamic update query based on provided fields
    let updateFields = [];
    let updateValues = [];

    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    
    if (position_type !== undefined) {
      updateFields.push('position_type = ?');
      updateValues.push(position_type);
    }
    
    if (work_type !== undefined) {
      updateFields.push('work_type = ?');
      updateValues.push(work_type);
    }
    
    if (designation_name !== undefined) {
      updateFields.push('designation_name = ?');
      updateValues.push(designation_name);
    }
    
    if (general_details !== undefined) {
      updateFields.push('general_details = ?');
      updateValues.push(general_details);
    }
    
    if (responsibilitiesJson !== undefined) {
      updateFields.push('responsibilities = ?');
      updateValues.push(responsibilitiesJson);
    }
    
    if (requirementsJson !== undefined) {
      updateFields.push('requirements = ?');
      updateValues.push(requirementsJson);
    }
    
    if (benefitsJson !== undefined) {
      updateFields.push('benefits = ?');
      updateValues.push(benefitsJson);
    }
    
    if (salary_price !== undefined) {
      updateFields.push('salary_price = ?');
      updateValues.push(salary_price);
    }
    
    if (salary_unit !== undefined) {
      updateFields.push('salary_unit = ?');
      updateValues.push(salary_unit);
    }
    
    if (salary_show !== undefined) {
      updateFields.push('salary_show = ?');
      updateValues.push(salary_show ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: "No fields to update"
      });
    }

    const updateJobQuery = `
      UPDATE jobs
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    // Add job ID to update values
    updateValues.push(jobId);

    await runQuery(updateJobQuery, updateValues);

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job_id: jobId
    });
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({
      error: "Failed to update job",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     tags:
 *       - Jobs
 *     summary: Delete Job
 *     description: Delete a job posting and its associated applications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the job to delete
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.delete("/api/jobs/:id", async (req, res) => {
  try {
    const jobId = req.params.id;

    // Check if job exists
    const checkJobQuery = `SELECT id FROM jobs WHERE id = ?`;
    const existingJob = await getOneQuery(checkJobQuery, [jobId]);
    
    if (!existingJob) {
      return res.status(404).json({
        error: "Job not found"
      });
    }

    // Get all applications for this job to delete resume files
    const getApplicationsQuery = `SELECT resume_path FROM applied_jobs WHERE job_id = ?`;
    const applications = await getQuery(getApplicationsQuery, [jobId]);

    // Delete the job (CASCADE will delete related applications from the db)
    const deleteJobQuery = `DELETE FROM jobs WHERE id = ?`;
    await runQuery(deleteJobQuery, [jobId]);

    // Delete resume files
    for (const application of applications) {
      if (application.resume_path) {
        try {
          const resumePath = path.join(__dirname, '..', application.resume_path);
          if (await existsAsync(resumePath)) {
            await unlinkAsync(resumePath);
          }
        } catch (fileError) {
          console.error(`Error deleting resume file: ${application.resume_path}`, fileError);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Job and associated applications deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({
      error: "Failed to delete job",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/job-applications:
 *   post:
 *     tags:
 *       - Job Applications
 *     summary: Apply for Job
 *     description: Submit a job application with resume and cover letter
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 description: ID of the job being applied for
 *               firstName:
 *                 type: string
 *                 description: First name of the applicant
 *               lastName:
 *                 type: string
 *                 description: Last name of the applicant
 *               email:
 *                 type: string
 *                 description: Email address of the applicant
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number of the applicant
 *               coverLetter:
 *                 type: string
 *                 description: Cover letter text (optional)
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume/CV file (PDF, DOC, DOCX)
 *             required:
 *               - jobId
 *               - firstName
 *               - lastName
 *               - email
 *               - phoneNumber
 *     responses:
 *       201:
 *         description: Job application submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */
router.post("/api/job-applications", upload.single('resume'), async (req, res) => {
  try {
    const { jobId, firstName, lastName, email, phoneNumber, coverLetter = "" } = req.body;
    
    // Validate required fields
    if (!jobId || !firstName || !lastName || !email || !phoneNumber) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["jobId", "firstName", "lastName", "email", "phoneNumber"]
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    // Validate phone number
    const phoneRegex = /^\+?[0-9\s\-()]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        error: "Invalid phone number format"
      });
    }

    // Check if job exists
    const getJobQuery = `SELECT * FROM jobs WHERE id = ?`;
    const job = await getOneQuery(getJobQuery, [jobId]);
    
    if (!job) {
      return res.status(404).json({
        error: "Job not found"
      });
    }

    // Check if resume was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "Resume is required"
      });
    }

    // Prepare resume information
    const resumePath = `uploads/resumes/${req.file.filename}`;
    
    // Insert application into database
    const insertApplicationQuery = `
      INSERT INTO applied_jobs (
        job_id, first_name, last_name, resume_path, 
        resume_original_name, cover_letter, email, phone_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await runQuery(insertApplicationQuery, [
      jobId,
      firstName,
      lastName,
      resumePath,
      req.file.originalname,
      coverLetter,
      email,
      phoneNumber
    ]);

    // Prepare data for email
    const formData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      coverLetter,
      resumePath: req.file.path,
      resumeFileName: req.file.filename,
      resumeOriginalName: req.file.originalname
    };

    // Parse JSON strings in job data
    const jobData = {
      ...job,
      responsibilities: JSON.parse(job.responsibilities || '[]'),
      requirements: JSON.parse(job.requirements || '[]'),
      benefits: JSON.parse(job.benefits || '[]')
    };

    // Send notification emails
    await sendJobApplicationEmails(formData, jobData);

    res.status(201).json({
      success: true,
      message: "Job application submitted successfully",
      application_id: result.id
    });
  } catch (error) {
    console.error("Error processing job application:", error);
    res.status(500).json({
      error: "Failed to process job application",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/job-applications:
 *   get:
 *     tags:
 *       - Job Applications
 *     summary: Get All Job Applications
 *     description: Retrieve all job applications with optional filtering by job ID
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: integer
 *         description: Filter applications by job ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of applications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of applications to skip
 *     responses:
 *       200:
 *         description: List of job applications retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/api/job-applications", async (req, res) => {
  try {
    const jobId = req.query.jobId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = `
      SELECT aj.*, j.designation_name, j.location, j.position_type, j.work_type
      FROM applied_jobs aj
      JOIN jobs j ON aj.job_id = j.id
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total FROM applied_jobs aj
    `;
    
    let queryParams = [];
    let countParams = [];
    
    // Add job ID filter if provided
    if (jobId) {
      query += ` WHERE aj.job_id = ?`;
      countQuery += ` WHERE aj.job_id = ?`;
      queryParams.push(jobId);
      countParams.push(jobId);
    }
    
    // Add ordering and pagination
    query += ` ORDER BY aj.applied_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
    
    const applications = await getQuery(query, queryParams);
    const countResult = await getOneQuery(countQuery, countParams);
    
    res.status(200).json({
      success: true,
      total: countResult.total,
      applications: applications
    });
  } catch (error) {
    console.error("Error fetching job applications:", error);
    res.status(500).json({
      error: "Failed to fetch job applications",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/job-applications/{id}:
 *   get:
 *     tags:
 *       - Job Applications
 *     summary: Get Job Application by ID
 *     description: Retrieve a specific job application by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the job application to retrieve
 *     responses:
 *       200:
 *         description: Job application retrieved successfully
 *       404:
 *         description: Job application not found
 *       500:
 *         description: Server error
 */
router.get("/api/job-applications/:id", async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    const query = `
      SELECT aj.*, j.designation_name, j.location, j.position_type, j.work_type, 
             j.general_details, j.responsibilities, j.requirements, j.benefits
      FROM applied_jobs aj
      JOIN jobs j ON aj.job_id = j.id
      WHERE aj.id = ?
    `;
    
    const application = await getOneQuery(query, [applicationId]);
    
    if (!application) {
      return res.status(404).json({
        error: "Job application not found"
      });
    }
    
    // Parse JSON strings for job details
    application.responsibilities = JSON.parse(application.responsibilities || '[]');
    application.requirements = JSON.parse(application.requirements || '[]');
    application.benefits = JSON.parse(application.benefits || '[]');
    
    res.status(200).json({
      success: true,
      application: application
    });
  } catch (error) {
    console.error("Error fetching job application:", error);
    res.status(500).json({
      error: "Failed to fetch job application",
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/job-applications/{id}/resume:
 *   get:
 *     tags:
 *       - Job Applications
 *     summary: Download Resume
 *     description: Download the resume file for a specific job application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the job application
 *     responses:
 *       200:
 *         description: Resume file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/msword:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Job application or resume not found
 *       500:
 *         description: Server error
 */
router.get("/api/job-applications/:id/resume", async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    const query = `
      SELECT resume_path, resume_original_name 
      FROM applied_jobs
      WHERE id = ?
    `;
    
    const application = await getOneQuery(query, [applicationId]);
    
    if (!application || !application.resume_path) {
      return res.status(404).json({
        error: "Resume not found"
      });
    }
    
    const resumePath = path.join(__dirname, '..', application.resume_path);
    
    // Check if file exists
    if (!fs.existsSync(resumePath)) {
      return res.status(404).json({
        error: "Resume file not found"
      });
    }
    
    // Set content type based on file extension
    const contentType = getFileContentType(application.resume_path);
    res.setHeader('Content-Type', contentType);
    
    // Set content disposition to download with original filename
    res.setHeader('Content-Disposition', `attachment; filename="${application.resume_original_name}"`);
    
    // Stream the file
    fs.createReadStream(resumePath).pipe(res);
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({
      error: "Failed to download resume",
      details: error.message
    });
  }
});

module.exports = router;
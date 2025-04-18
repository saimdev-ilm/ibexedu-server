const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const { db } = require("../db/conn");

/**
 * @swagger
 * tags:
 *   - name: Contact
 *     description: Operations related to contact form submissions
 *
 * /api/contact:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Submit Contact Form
 *     description: Submit contact form data and send an email notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the person submitting the form
 *               email:
 *                 type: string
 *                 description: Email address of the person
 *               phone:
 *                 type: string
 *                 description: Phone number of the person
 *               company:
 *                 type: string
 *                 description: Company or organization name
 *               message:
 *                 type: string
 *                 description: Optional message content
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - company
 *     responses:
 *       201:
 *         description: Contact form submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, company, message = "" } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !company) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "email", "phone", "company"]
      });
    }
    
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    // Phone number validation regex (basic example, can be improved)
    const phoneRegex = /^\+?[0-9\s\-()]+$/; // Allows +, spaces, dashes, and parentheses
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error: "Invalid phone number format"
      });
    }
    
    // Send email notification if GMAIL_USER is configured
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
      
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: "saimabbasi486@gmail.com",
        replyTo: email,
        subject: `New Contact Form Submission from ${name} at ${company}`,
        text: `
          Name: ${name}
          Email: ${email}
          Phone: ${phone}
          Company: ${company}
          Message: ${message || "No message provided"}
        `,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Message:</strong> ${message || "No message provided"}</p>
        `
      };
      
      try {
        await transporter.sendMail(mailOptions);
        console.log("Email notification sent");
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Continue with the response even if email fails
      }
    }
    
    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully"
    });
    
  } catch (error) {
    console.error("Error processing contact submission:", error);
    res.status(500).json({
      error: "Failed to process contact submission",
      details: error.message
    });
  }
});



module.exports = router;
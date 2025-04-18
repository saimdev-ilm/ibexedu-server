const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

/**
 * @swagger
 * tags:
 *   - name: Contact
 *     description: Operations related to contact forms and email
 *
 * /api/contact/send-email:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Send Contact Form Email
 *     description: Sends form data as an email to info@ibexvision.ai
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the person submitting the form
 *               email:
 *                 type: string
 *                 description: Email of the person submitting the form
 *               subject:
 *                 type: string
 *                 description: Subject of the email
 *               message:
 *                 type: string
 *                 description: Message content
 *             required:
 *               - name
 *               - email
 *               - message
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Error sending email
 */
router.post("/api/contact/send-email", async (req, res) => {
  try {
    // Validate required fields
    const { name, email, subject, message, ...otherFormData } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "email", "message"]
      });
    }

    // Create email transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail email address
        pass: process.env.GMAIL_APP_PASSWORD // Your Gmail app password
      }
    });

    // Prepare email content (including all form fields)
    const formDataString = Object.entries({
      name,
      email,
      subject: subject || "Contact Form Submission",
      message,
      ...otherFormData
    })
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n\n');

    // Define email options
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: "saimabbasi486@gmail.com",
      replyTo: email,
      subject: subject || `New Contact Form Submission from ${name}`,
      text: formDataString,
      html: `
        <h2>New Contact Form Submission</h2>
        <hr>
        ${Object.entries({
          name,
          email,
          subject: subject || "Contact Form Submission",
          message,
          ...otherFormData
        })
          .map(([key, value]) => `<p><strong>${key}:</strong> ${typeof value === 'string' ? value.replace(/\n/g, '<br>') : value}</p>`)
          .join('')}
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Email sent successfully"
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      error: "Failed to send email",
      details: error.message
    });
  }
});

module.exports = router;
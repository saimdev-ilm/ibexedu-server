const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const { db } = require("../db/conn");

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

    if (!name || !email || !phone || !company) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "email", "phone", "company"],
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    const phoneRegex = /^\+?[0-9\s\-()]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error: "Invalid phone number format",
      });
    }

    // Create a beautiful HTML email template for admin notification
    const adminHtmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
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
          color: black;
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
        
        .notification-icon {
          font-size: 24px;
          margin-bottom: 10px;
          display: block;
        }
        
        .timestamp {
          font-size: 14px;
          margin-top: 10px;
          opacity: 0.8;
        }
        
        .email-body {
          padding: 30px 25px;
        }
        
        .intro-text {
          margin-bottom: 25px;
          font-size: 16px;
        }
        
        .contact-details {
          background-color: #f9fafc;
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 25px;
          border-left: 4px solid #3498db;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #2c3e50;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 8px;
        }
        
        .detail-row {
          margin-bottom: 12px;
          display: flex;
        }
        
        .detail-label {
          font-weight: 500;
          width: 100px;
          color: #555;
          flex-shrink: 0;
        }
        
        .detail-value {
          flex-grow: 1;
          word-break: break-word;
        }
        
        .message-box {
          background-color: #f9fafc;
          padding: 25px;
          border-radius: 10px;
          border-left: 4px solid #2ecc71;
        }
        
        .message-content {
          background-color: white;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #eee;
          font-style: italic;
          color: #555;
        }
        
        .actions {
          margin-top: 25px;
          text-align: center;
        }
        
        .action-button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 5px;
          font-weight: 500;
          transition: background-color 0.3s;
        }
        
        .action-button:hover {
          background-color: #2980b9;
        }
        
        .email-footer {
          background-color: #f4f7f9;
          padding: 20px 15px;
          text-align: center;
          font-size: 13px;
          color: #666;
          border-top: 1px solid #eaeaea;
        }
        
        .company-info {
          margin-top: 10px;
          font-size: 12px;
        }
        
        @media only screen and (max-width: 600px) {
          .email-container {
            border-radius: 0;
            margin: 0;
          }
          
          .email-header {
            padding: 20px 15px;
          }
          
          .email-header h1 {
            font-size: 24px;
          }
          
          .email-body {
            padding: 20px 15px;
          }
          
          .detail-row {
            flex-direction: column;
          }
          
          .detail-label {
            width: 100%;
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <span class="notification-icon">📬</span>
          <h1>New Contact Form Submission</h1>
          <div class="timestamp">${new Date().toLocaleString()}</div>
        </div>
        <div class="email-body">
          <div class="intro-text">
            You have received a new inquiry from your ibexVision website contact form. Here are the details:
          </div>
          
          <div class="contact-details">
            <div class="section-title">Contact Information</div>
            <div class="detail-row">
              <div class="detail-label">Name:</div>
              <div class="detail-value">${name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Email:</div>
              <div class="detail-value">${email}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Phone:</div>
              <div class="detail-value">${phone}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Company:</div>
              <div class="detail-value">${company}</div>
            </div>
          </div>
          
          <div class="message-box">
            <div class="section-title">Message Content</div>
            <div class="message-content">
              ${message ? message.replace(/\n/g, '<br>') : '<em>No message provided</em>'}
            </div>
          </div>
          
          <div class="actions">
            <a href="mailto:${email}" class="action-button">Reply to ${name}</a>
          </div>
        </div>
        <div class="email-footer">
          <p>This is an automated notification from the ibexVision Contact System.</p>
          <div class="company-info">
            © ${new Date().getFullYear()} ibexVision. All rights reserved.
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Create confirmation email template for the user who submitted the form
    const userConfirmationHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Contacting Us</title>
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
        
        .logo {
          max-width: 150px;
          margin-bottom: 15px;
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
        
        .note {
          background-color: #f0f7fb;
          border-left: 4px solid #3498db;
          padding: 15px;
          margin: 25px 0;
          text-align: left;
          border-radius: 5px;
        }
        
        .cta-button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 50px;
          font-weight: 500;
          font-size: 16px;
          transition: background-color 0.3s;
          margin-top: 15px;
        }
        
        .cta-button:hover {
          background-color: #2980b9;
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
        
        .social-links {
          margin: 20px 0;
        }
        
        .social-icon {
          display: inline-block;
          margin: 0 8px;
          font-size: 20px;
          color: #3498db;
          text-decoration: none;
        }
        
        .email-footer {
          background-color: #f4f7f9;
          padding: 20px 15px;
          text-align: center;
          font-size: 13px;
          color: #666;
          border-top: 1px solid #eaeaea;
        }
        
        .company-info {
          margin-top: 10px;
          font-size: 12px;
        }
        
        @media only screen and (max-width: 600px) {
          .email-container {
            border-radius: 0;
            margin: 0;
          }
          
          .email-header {
            padding: 20px 15px;
          }
          
          .email-header h1 {
            font-size: 24px;
          }
          
          .email-body {
            padding: 25px 15px;
          }
          
          .greeting {
            font-size: 20px;
          }
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
          <div class="greeting">Thank You, ${name}!</div>
          
          <div class="message">
            We have received your inquiry and appreciate you taking the time to reach out to us. Our team is reviewing your message and will get back to you as soon as possible.
          </div>
          
          <div class="note">
            <strong>Your inquiry details:</strong><br>
            - Name: ${name}<br>
            - Email: ${email}<br>
            - Company: ${company}<br>
            ${message ? `- Message: "${message.length > 50 ? message.substring(0, 50) + '...' : message}"` : ''}
          </div>
          
          <a href="https://ibexvision.ai" class="cta-button">Explore Our Solutions</a>
          
          <div class="divider"></div>
          
          <div class="contact-info">
            <p>If you have any urgent questions, please don't hesitate to contact us directly:</p>
            <p><strong>Email:</strong> customersupport@ibexvision.com</p>
            <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            
            <div class="social-links">
              <a href="#" class="social-icon">📘</a>
              <a href="#" class="social-icon">📱</a>
              <a href="#" class="social-icon">📷</a>
              <a href="#" class="social-icon">💼</a>
            </div>
          </div>
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} ibexVision. All rights reserved.</p>
          <div class="company-info">
            123 Tech Boulevard, Innovation City, CA 94103
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send the admin notification email using Microsoft Graph API
    await client.api(`/users/${senderEmail}/sendMail`).post({
      message: {
        subject: "New Contact Form Submission - ibexVision",
        body: {
          contentType: "HTML",
          content: adminHtmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: "saim@ilmach.com",
            },
          },
        ],
      },
    });

    // Send confirmation email to the user who submitted the form
    await client.api(`/users/${senderEmail}/sendMail`).post({
      message: {
        subject: "Thank You for Contacting ibexVision",
        body: {
          contentType: "HTML",
          content: userConfirmationHtml,
        },
        toRecipients: [
          {
            emailAddress: {
              address: email, // Send to the email provided in the form
            },
          },
        ],
      },
    });

    console.log("Emails sent successfully.");

    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully",
    });
  } catch (error) {
    console.error("Error processing contact submission:", error);
    res.status(500).json({
      error: "Failed to process contact submission",
      details: error.message,
    });
  }
});

module.exports = router;
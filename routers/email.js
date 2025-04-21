const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up file storage for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/resumes");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

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

// Email Templates - Admin Notification
const createAdminEmailTemplate = (formType, formData) => {
  // Get form-specific section for the email body
  let formSpecificSection = '';

  switch(formType) {
    case 'contact':
      formSpecificSection = `
        <div class="contact-details">
          <div class="section-title">Contact Information</div>
          <div class="detail-row">
            <div class="detail-label">Name:</div>
            <div class="detail-value">${formData.name}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${formData.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${formData.phone}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Company:</div>
            <div class="detail-value">${formData.company}</div>
          </div>
        </div>
        
        <div class="message-box">
          <div class="section-title">Message Content</div>
          <div class="message-content">
            ${formData.message ? formData.message.replace(/\n/g, '<br>') : '<em>No message provided</em>'}
          </div>
        </div>
      `;
      break;

    case 'demo':
      formSpecificSection = `
        <div class="contact-details">
          <div class="section-title">Demo Request Information</div>
          <div class="detail-row">
            <div class="detail-label">Full Name:</div>
            <div class="detail-value">${formData.fullName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${formData.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${formData.phone}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Company:</div>
            <div class="detail-value">${formData.company}</div>
          </div>
        </div>
        
        <div class="message-box">
          <div class="section-title">Additional Information</div>
          <div class="message-content">
            ${formData.message ? formData.message.replace(/\n/g, '<br>') : '<em>No additional information provided</em>'}
          </div>
        </div>
      `;
      break;

    case 'help':
      formSpecificSection = `
        <div class="contact-details">
          <div class="section-title">Help Request Information</div>
          <div class="detail-row">
            <div class="detail-label">Full Name:</div>
            <div class="detail-value">${formData.fullName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${formData.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${formData.phone}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Subject:</div>
            <div class="detail-value">${formData.subject}</div>
          </div>
        </div>
        
        <div class="message-box">
          <div class="section-title">Message Content</div>
          <div class="message-content">
            ${formData.message ? formData.message.replace(/\n/g, '<br>') : '<em>No message provided</em>'}
          </div>
        </div>
      `;
      break;

    case 'partnership':
      formSpecificSection = `
        <div class="contact-details">
          <div class="section-title">Partnership Request Information</div>
          <div class="detail-row">
            <div class="detail-label">Company:</div>
            <div class="detail-value">${formData.company}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Contact:</div>
            <div class="detail-value">${formData.contactPerson}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${formData.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${formData.phone || 'Not provided'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Partnership:</div>
            <div class="detail-value">${formData.partnershipType}</div>
          </div>
        </div>
        
        <div class="message-box">
          <div class="section-title">Message Content</div>
          <div class="message-content">
            ${formData.message ? formData.message.replace(/\n/g, '<br>') : '<em>No message provided</em>'}
          </div>
        </div>
      `;
      break;

    case 'job':
      formSpecificSection = `
        <div class="contact-details">
          <div class="section-title">Job Application Information</div>
          <div class="detail-row">
            <div class="detail-label">Name:</div>
            <div class="detail-value">${formData.firstName} ${formData.lastName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${formData.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Position:</div>
            <div class="detail-value">${formData.position}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Resume:</div>
            <div class="detail-value">${formData.resumePath ? 'Attached' : 'Not provided'}</div>
          </div>
        </div>
        
        <div class="message-box">
          <div class="section-title">Cover Letter</div>
          <div class="message-content">
            ${formData.coverLetter ? formData.coverLetter.replace(/\n/g, '<br>') : '<em>No cover letter provided</em>'}
          </div>
        </div>
      `;
      break;

    case 'ibexcortex':
      formSpecificSection = `
        <div class="contact-details">
          <div class="section-title">ibexCortex Request Information</div>
          <div class="detail-row">
            <div class="detail-label">Full Name:</div>
            <div class="detail-value">${formData.fullName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Company:</div>
            <div class="detail-value">${formData.company}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Job Title:</div>
            <div class="detail-value">${formData.jobTitle}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${formData.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${formData.phone || 'Not provided'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Services:</div>
            <div class="detail-value">${formData.services.join(', ')}</div>
          </div>
        </div>
        
        <div class="message-box">
          <div class="section-title">Project Description</div>
          <div class="message-content">
            ${formData.projectDescription ? formData.projectDescription.replace(/\n/g, '<br>') : '<em>No project description provided</em>'}
          </div>
        </div>
      `;
      break;

    case 'course':
      formSpecificSection = `
        <div class="contact-details">
          <div class="section-title">Course Enrollment Information</div>
          <div class="detail-row">
            <div class="detail-label">Course:</div>
            <div class="detail-value">${formData.courseName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Full Name:</div>
            <div class="detail-value">${formData.fullName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${formData.email}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${formData.phone}</div>
          </div>
        </div>
        
        <div class="message-box">
          <div class="section-title">Additional Message</div>
          <div class="message-content">
            ${formData.message ? formData.message.replace(/\n/g, '<br>') : '<em>No message provided</em>'}
          </div>
        </div>
      `;
      break;

    default:
      formSpecificSection = `
        <div class="message-box">
          <div class="section-title">Form Data</div>
          <div class="message-content">
            <pre>${JSON.stringify(formData, null, 2)}</pre>
          </div>
        </div>
      `;
  }

  // Map form types to subject lines
  const subjectMap = {
    'contact': 'New Contact Form Submission',
    'demo': 'New Demo Request',
    'help': 'New Help Center Inquiry',
    'partnership': 'New Partnership Program Query',
    'job': 'New Job Application',
    'ibexcortex': 'New ibexCortex Service Request',
    'course': 'New Course Enrollment'
  };

  const subject = subjectMap[formType] || 'New Form Submission';

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject} - ibexVision</title>
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
        border-bottom: 1px solid #eaeaea;
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
        <h1>${subject}</h1>
        <div class="timestamp">${new Date().toLocaleString()}</div>
      </div>
      <div class="email-body">
        <div class="intro-text">
          You have received a new submission from the ibexVision website. Here are the details:
        </div>
        
        ${formSpecificSection}
        
        <div class="actions">
          ${formData.email ? `<a href="mailto:${formData.email}" class="action-button">Reply to Inquiry</a>` : ''}
        </div>
      </div>
      <div class="email-footer">
        <p>This is an automated notification from the ibexVision System.</p>
        <div class="company-info">
          © ${new Date().getFullYear()} ibexVision. All rights reserved.
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

// Email Templates - User Confirmation
const createUserEmailTemplate = (formType, formData) => {
  // Map form types to subject lines and messages
  const subjectMap = {
    'contact': 'Thank You for Contacting ibexVision',
    'demo': 'Your Demo Request Has Been Received',
    'help': 'Support Ticket Received - ibexVision Help Center',
    'partnership': 'Thank You for Your Partnership Interest',
    'job': 'Job Application Received - ibexVision',
    'ibexcortex': 'Your ibexCortex Request Has Been Received',
    'course': 'Course Enrollment Confirmation'
  };

  const messageMap = {
    'contact': 'We have received your inquiry and appreciate you taking the time to reach out to us. Our team is reviewing your message and will get back to you as soon as possible.',
    'demo': 'Thank you for your interest in ibexVision! We have received your demo request and our team is currently reviewing it. A member of our sales team will contact you shortly to schedule your personalized demo.',
    'help': 'We have received your support request and our team is working to address your inquiry. A support representative will contact you soon. Your request has been assigned a ticket for tracking purposes.',
    'partnership': 'Thank you for your interest in partnering with ibexVision! We have received your partnership request and our team is currently reviewing it. A member of our partnerships team will contact you shortly to discuss the next steps.',
    'job': 'Thank you for applying to ibexVision! We have received your application and our recruitment team will review it shortly. We appreciate your interest in joining our team.',
    'ibexcortex': 'Thank you for your interest in ibexCortex! We have received your request and are excited about the possibility of working with you. A technical consultant will reach out soon to discuss your project needs in detail.',
    'course': 'Thank you for enrolling in our course! We have received your enrollment request and are processing it. You will receive further instructions shortly.'
  };

  const subject = subjectMap[formType] || 'Thank You for Contacting ibexVision';
  const message = messageMap[formType] || 'We have received your submission and appreciate you taking the time to reach out to us. Our team will get back to you as soon as possible.';

  // Get name for personalization
  let name = '';
  if (formType === 'job') {
    name = `${formData.firstName} ${formData.lastName}`;
  } else if (formData.fullName) {
    name = formData.fullName;
  } else if (formData.name) {
    name = formData.name;
  } else if (formData.contactPerson) {
    name = formData.contactPerson;
  } else {
    name = "Valued Customer";
  }

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
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
          ${message}
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
};

// Helper function to determine recipient email based on form type
const getRecipientEmail = (formType) => {
  if (formType === 'job') {
    return 'jobs@ibexvision.ai';
  }
  return 'info@ibexvision.ai';
};

// Helper function to send emails
const sendEmails = async (formType, formData, userEmail) => {
  const recipientEmail = getRecipientEmail(formType);
  const adminHtmlContent = createAdminEmailTemplate(formType, formData);
  const userHtmlContent = createUserEmailTemplate(formType, formData);
  
  // Map form types to admin email subjects
  const subjectMap = {
    'contact': 'New Contact Form Submission - ibexVision',
    'demo': 'New Demo Request - ibexVision',
    'help': 'New Help Center Inquiry - ibexVision',
    'partnership': 'New Partnership Program Query - ibexVision',
    'job': 'New Job Application - ibexVision',
    'ibexcortex': 'New ibexCortex Service Request - ibexVision',
    'course': 'New Course Enrollment - ibexVision'
  };

  const adminSubject = subjectMap[formType] || 'New Form Submission - ibexVision';
  
  // Map form types to user email subjects
  const userSubjectMap = {
    'contact': 'Thank You for Contacting ibexVision',
    'demo': 'Your Demo Request Has Been Received - ibexVision',
    'help': 'Support Ticket Received - ibexVision Help Center',
    'partnership': 'Thank You for Your Partnership Interest - ibexVision',
    'job': 'Job Application Received - ibexVision',
    'ibexcortex': 'Your ibexCortex Request Has Been Received - ibexVision',
    'course': 'Course Enrollment Confirmation - ibexVision'
  };

  const userSubject = userSubjectMap[formType] || 'Thank You for Contacting ibexVision';

  // Send the admin notification email using Microsoft Graph API
  await client.api(`/users/${senderEmail}/sendMail`).post({
    message: {
      subject: adminSubject,
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
    },
  });

  // Send confirmation email to the user
  await client.api(`/users/${senderEmail}/sendMail`).post({
    message: {
      subject: userSubject,
      body: {
        contentType: "HTML",
        content: userHtmlContent,
      },
      toRecipients: [
        {
          emailAddress: {
            address: userEmail,
          },
        },
      ],
    },
  });

  console.log(`Emails sent successfully for ${formType} form. Admin email sent to ${recipientEmail} and confirmation email sent to ${userEmail}`);
};

/**
 * Input validation helper functions
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return true; // Phone can be optional in some forms
  const phoneRegex = /^\+?[0-9\s\-()]+$/;
  return phoneRegex.test(phone);
};

const validateRequired = (data, fields) => {
  const missingFields = fields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    return {
      valid: false,
      missingFields
    };
  }
  return { valid: true };
};

/**
 * @swagger
 * /api/job-application:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Submit Job Application
 *     description: Submit a job application with resume and cover letter
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: First name of the applicant
 *               lastName:
 *                 type: string
 *                 description: Last name of the applicant
 *               email:
 *                 type: string
 *                 description: Email address
 *               position:
 *                 type: string
 *                 description: Position applied for
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume/CV file (PDF, DOC, DOCX)
 *               coverLetter:
 *                 type: string
 *                 description: Cover letter text (optional)
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - position
 *     responses:
 *       201:
 *         description: Job application submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/job-application", upload.single('resume'), async (req, res) => {
  try {
    const { firstName, lastName, email, position, coverLetter = "" } = req.body;
    
    // Validate required fields
    const requiredValidation = validateRequired(
      { firstName, lastName, email, position },
      ["firstName", "lastName", "email", "position"]
    );
    
    if (!requiredValidation.valid) {
      return res.status(400).json({
        error: "Missing required fields",
        required: requiredValidation.missingFields,
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate position
    const validPositions = [
      'Software Engineer',
      'UX Designer',
      'Product Manager',
      'QA Engineer',
      'DevOps Specialist',
      'Project Manager'
    ];
    
    if (!validPositions.includes(position)) {
      return res.status(400).json({
        error: "Invalid position selected",
        validPositions,
      });
    }

    // Prepare form data with resume path if uploaded
    const formData = { 
      firstName, 
      lastName, 
      email, 
      position, 
      coverLetter,
      resumePath: req.file ? req.file.path : null
    };
    
    // Send emails
    await sendEmails('job', formData, email);

    res.status(201).json({
      success: true,
      message: "Job application submitted successfully",
    });
  } catch (error) {
    console.error("Error processing job application:", error);
    res.status(500).json({
      error: "Failed to process job application",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/ibexcortex:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Request ibexCortex Services
 *     description: Submit a request for ibexCortex services
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Full name of the person
 *               company:
 *                 type: string
 *                 description: Company name
 *               jobTitle:
 *                 type: string
 *                 description: Job title
 *               email:
 *                 type: string
 *                 description: Email address
 *               phone:
 *                 type: string
 *                 description: Phone number (optional)
 *               services:
 *                 type: array
 *                 description: List of interested services
 *                 items:
 *                   type: string
 *               projectDescription:
 *                 type: string
 *                 description: Project description
 *             required:
 *               - fullName
 *               - company
 *               - jobTitle
 *               - email
 *               - services
 *     responses:
 *       201:
 *         description: ibexCortex request submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/ibexcortex", async (req, res) => {
  try {
    const { fullName, company, jobTitle, email, phone, services, projectDescription = "" } = req.body;
    
    // Validate required fields
    const requiredValidation = validateRequired(
      { fullName, company, jobTitle, email, services },
      ["fullName", "company", "jobTitle", "email", "services"]
    );
    
    if (!requiredValidation.valid) {
      return res.status(400).json({
        error: "Missing required fields",
        required: requiredValidation.missingFields,
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate phone format if provided
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        error: "Invalid phone number format",
      });
    }

    // Validate services array
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        error: "At least one service must be selected",
      });
    }

    const validServices = [
      'Automated Batch Processing',
      'End-to-End Simulation Pipeline',
      'Scene & AI Scenario',
      'Drive Lab & KPIs',
      'Fault Injection Across ASPICE',
      'Autonomous Fleet Management'
    ];

    const invalidServices = services.filter(service => !validServices.includes(service));
    if (invalidServices.length > 0) {
      return res.status(400).json({
        error: "Invalid services selected",
        invalidServices,
        validServices,
      });
    }

    // Prepare form data
    const formData = { fullName, company, jobTitle, email, phone, services, projectDescription };
    
    // Send emails
    await sendEmails('ibexcortex', formData, email);

    res.status(201).json({
      success: true,
      message: "ibexCortex request submitted successfully",
    });
  } catch (error) {
    console.error("Error processing ibexCortex request:", error);
    res.status(500).json({
      error: "Failed to process ibexCortex request",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/course-enrollment:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Enroll in Course
 *     description: Submit a course enrollment request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseName:
 *                 type: string
 *                 description: Name of the course
 *               fullName:
 *                 type: string
 *                 description: Full name of the enrollee
 *               email:
 *                 type: string
 *                 description: Email address
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               message:
 *                 type: string
 *                 description: Additional message (optional)
 *             required:
 *               - courseName
 *               - fullName
 *               - email
 *               - phone
 *     responses:
 *       201:
 *         description: Course enrollment submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/course-enrollment", async (req, res) => {
  try {
    const { courseName, fullName, email, phone, message = "" } = req.body;
    
    // Validate required fields
    const requiredValidation = validateRequired(
      { courseName, fullName, email, phone },
      ["courseName", "fullName", "email", "phone"]
    );
    
    if (!requiredValidation.valid) {
      return res.status(400).json({
        error: "Missing required fields",
        required: requiredValidation.missingFields,
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return res.status(400).json({
        error: "Invalid phone number format",
      });
    }

    // Prepare form data
    const formData = { courseName, fullName, email, phone, message };
    
    // Send emails
    await sendEmails('course', formData, email);

    res.status(201).json({
      success: true,
      message: "Course enrollment submitted successfully",
    });
  } catch (error) {
    console.error("Error processing course enrollment:", error);
    res.status(500).json({
      error: "Failed to process course enrollment",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/partnership:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Submit Partnership Query
 *     description: Submit a partnership program query
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company:
 *                 type: string
 *                 description: Company name
 *               contactPerson:
 *                 type: string
 *                 description: Contact person name
 *               email:
 *                 type: string
 *                 description: Email address
 *               phone:
 *                 type: string
 *                 description: Phone number (optional)
 *               partnershipType:
 *                 type: string
 *                 description: Type of partnership requested
 *                 enum: [Reseller, Affiliate, Integration, Other]
 *               message:
 *                 type: string
 *                 description: Additional message (optional)
 *             required:
 *               - company
 *               - contactPerson
 *               - email
 *               - partnershipType
 *     responses:
 *       201:
 *         description: Partnership query submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/partnership", async (req, res) => {
  try {
    const { company, contactPerson, email, phone, partnershipType, message = "" } = req.body;
    
    // Validate required fields
    const requiredValidation = validateRequired(
      { company, contactPerson, email, partnershipType },
      ["company", "contactPerson", "email", "partnershipType"]
    );
    
    if (!requiredValidation.valid) {
      return res.status(400).json({
        error: "Missing required fields",
        required: requiredValidation.missingFields,
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate phone format if provided
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        error: "Invalid phone number format",
      });
    }

    // Validate partnership type
    const validPartnershipTypes = ['Reseller', 'Affiliate', 'Integration', 'Other'];
    if (!validPartnershipTypes.includes(partnershipType)) {
      return res.status(400).json({
        error: "Invalid partnership type",
        validTypes: validPartnershipTypes,
      });
    }

    // Prepare form data
    const formData = { company, contactPerson, email, phone, partnershipType, message };
    
    // Send emails
    await sendEmails('partnership', formData, email);

    res.status(201).json({
      success: true,
      message: "Partnership query submitted successfully",
    });
  } catch (error) {
    console.error("Error processing partnership query:", error);
    res.status(500).json({
      error: "Failed to process partnership query",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/help-center:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Contact Help Center
 *     description: Submit a help request to the support team
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Full name of the person
 *               email:
 *                 type: string
 *                 description: Email address
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               subject:
 *                 type: string
 *                 description: Inquiry subject (dropdown selection)
 *                 enum: [Technical Support, Billing Question, Feature Request, General Inquiry]
 *               message:
 *                 type: string
 *                 description: Message content
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - subject
 *               - message
 *     responses:
 *       201:
 *         description: Help center request submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/help-center", async (req, res) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;
    
    // Validate required fields
    const requiredValidation = validateRequired(
      { fullName, email, phone, subject, message },
      ["fullName", "email", "phone", "subject", "message"]
    );
    
    if (!requiredValidation.valid) {
      return res.status(400).json({
        error: "Missing required fields",
        required: requiredValidation.missingFields,
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return res.status(400).json({
        error: "Invalid phone number format",
      });
    }

    // Validate subject
    const validSubjects = ['Technical Support', 'Billing Question', 'Feature Request', 'General Inquiry'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({
        error: "Invalid subject selected",
        validSubjects,
      });
    }

    // Prepare form data
    const formData = { fullName, email, phone, subject, message };
    
    // Send emails
    await sendEmails('help', formData, email);

    res.status(201).json({
      success: true,
      message: "Help center request submitted successfully",
    });
  } catch (error) {
    console.error("Error processing help center request:", error);
    res.status(500).json({
      error: "Failed to process help center request",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/request-demo:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Request Demo
 *     description: Submit a request for product demonstration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Full name of the person requesting the demo
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
 *                 description: Optional additional information
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - company
 *     responses:
 *       201:
 *         description: Demo request submitted successfully
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Server error
 */
router.post("/api/request-demo", async (req, res) => {
  try {
    const { fullName, email, phone, company, message = "" } = req.body;
    
    // Validate required fields
    const requiredValidation = validateRequired(
      { fullName, email, phone, company },
      ["fullName", "email", "phone", "company"]
    );
    
    if (!requiredValidation.valid) {
      return res.status(400).json({
        error: "Missing required fields",
        required: requiredValidation.missingFields,
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return res.status(400).json({
        error: "Invalid phone number format",
      });
    }

    // Prepare form data
    const formData = { fullName, email, phone, company, message };
    
    // Send emails
    await sendEmails('demo', formData, email);

    res.status(201).json({
      success: true,
      message: "Demo request submitted successfully",
    });
  } catch (error) {
    console.error("Error processing demo request:", error);
    res.status(500).json({
      error: "Failed to process demo request",
      details: error.message,
    });
  }
});

// Export the router
module.exports = router;
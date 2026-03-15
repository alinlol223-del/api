require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',           // ← for testing your Chrome extension; change to specific origin later if needed
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// Gmail transporter using app password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Main POST endpoint (all requests to this file go here)
app.post('/', async (req, res) => {
  const { to, subject, body, forwardTo } = req.body;

  // Required fields check
  if (!to || !body) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: "to" and "body"'
    });
  }

  try {
    // 1. Send the DMCA notice to Roblox
    await transporter.sendMail({
      from: `"RoDown DMCA" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject || 'DMCA Takedown Request',
      text: body
    });

    // 2. Optional: send copy to the user who submitted it
    if (forwardTo && forwardTo.trim()) {
      await transporter.sendMail({
        from: `"RoDown DMCA" <${process.env.GMAIL_USER}>`,
        to: forwardTo,
        subject: 'Copy: Your DMCA notice was sent to Roblox',
        text: `Your report has been forwarded to Roblox.\n\n--- Original message ---\n\n${body}\n\nThank you.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'DMCA email sent successfully'
    });

  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
});

// Required for Vercel serverless functions
module.exports = app; 
//test

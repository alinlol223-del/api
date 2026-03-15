require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json({ limit: '1mb' })); // Prevent huge payloads
app.use(cors({
  origin: '*', // Change to your Chrome extension ID later, e.g. 'chrome-extension://your-extension-id'
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization'] // If you add API key later
}));

// Transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Validate env vars on startup (helps debug)
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars');
}

// POST handler
app.post('/', async (req, res) => {
  const { to, subject, body, forwardTo } = req.body;

  if (!to || !body) {
    return res.status(400).json({ success: false, error: 'Missing "to" and/or "body"' });
  }

  // Basic email format check (optional but helpful)
  if (!to.includes('@')) {
    return res.status(400).json({ success: false, error: 'Invalid "to" email' });
  }

  try {
    // Send to recipient (e.g. Roblox DMCA email)
    await transporter.sendMail({
      from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
      to,
      subject: subject || 'DMCA Takedown Request',
      text: body,
      // html: `<pre>${body}</pre>` // optional: if you want better formatting
    });

    // Optional forward
    if (forwardTo && forwardTo.trim() && forwardTo.includes('@')) {
      await transporter.sendMail({
        from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
        to: forwardTo,
        subject: 'Copy: Your DMCA Notice Sent',
        text: `Your DMCA request was sent successfully.\n\nOriginal:\n${body}`
      });
    }

    res.status(200).json({ success: true, message: 'DMCA notice sent' });
  } catch (error) {
    console.error('Email error:', error);
    // Don't expose full error to client
    res.status(500).json({ success: false, error: 'Failed to send email. Check server logs.' });
  }
});

module.exports = app;

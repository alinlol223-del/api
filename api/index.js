// api/index.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const cors = require('cors');

const corsMiddleware = cors({
  origin: true,                 // Allow any origin (including chrome-extension://)
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
  optionsSuccessStatus: 204     // Important for preflight
});

module.exports = async (req, res) => {
  // Handle CORS preflight OPTIONS request (browser sends this first)
  corsMiddleware(req, res, () => {});

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST after preflight
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  let bodyData;
  try {
    bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }

  const { to, subject, body, forwardTo } = bodyData;

  if (!to || !body) {
    return res.status(400).json({ success: false, error: 'Missing "to" or "body"' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    pool: true,
    connectionTimeout: 5000,
    socketTimeout: 10000
  });

  try {
    await transporter.verify();

    await transporter.sendMail({
      from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
      to,
      subject: subject || 'DMCA Takedown Request',
      text: body
    });

    if (forwardTo && forwardTo.trim()) {
      await transporter.sendMail({
        from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
        to: forwardTo,
        subject: 'Copy: Your DMCA Notice Sent',
        text: `Your DMCA notice was successfully sent to Roblox.\n\nOriginal:\n${body}`
      });
    }

    res.status(200).json({ success: true, message: 'DMCA notice sent successfully' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email – check server logs'
    });
  }
};

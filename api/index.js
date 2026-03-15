require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: '*',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars');
}

// Changed to match full incoming path after rewrite
app.post('/api/send-dmca', async (req, res) => {
  const { to, subject, body, forwardTo } = req.body;

  if (!to || !body) {
    return res.status(400).json({ success: false, error: 'Missing "to" and/or "body"' });
  }

  if (!to.includes('@')) {
    return res.status(400).json({ success: false, error: 'Invalid "to" email' });
  }

  try {
    await transporter.sendMail({
      from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
      to,
      subject: subject || 'DMCA Takedown Request',
      text: body
    });

    if (forwardTo && forwardTo.trim() && forwardTo.includes('@')) {
      await transporter.sendMail({
        from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
        to: forwardTo,
        subject: 'Copy: Your DMCA Notice Sent',
        text: `Your DMCA request was sent.\n\nOriginal:\n${body}`
      });
    }

    res.status(200).json({ success: true, message: 'DMCA notice sent' });
  } catch (error) {
    console.error('Email error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to send email. Check logs.' });
  }
});

// Optional: Catch unmatched methods/paths
app.use((req, res) => {
  res.status(405).json({ error: `Method ${req.method} not allowed on ${req.path}` });
});

module.exports = app;

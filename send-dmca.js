require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));  // For testing; you can restrict later

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

app.post('/', async (req, res) => {
  const { to, subject, body, forwardTo } = req.body;

  if (!to || !body) {
    return res.status(400).json({ success: false, error: 'to and body are required' });
  }

  try {
    // Send DMCA to Roblox
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: to,
      subject: subject || 'DMCA Takedown Request',
      text: body
    });

    // Optional forward to user
    if (forwardTo) {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: forwardTo,
        subject: 'Copy of your DMCA notice',
        text: `Your notice was sent to Roblox.\n\nOriginal body:\n${body}`
      });
    }

    res.json({ success: true, message: 'Email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;
// api/index.js
require('dotenv').config();
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed. Use POST only.` });
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
        text: `Your DMCA notice was successfully sent to Roblox.\n\nOriginal message:\n${body}`
      });
    }

    console.log(`✅ DMCA sent to ${to} | Forward: ${forwardTo || 'none'}`);
    res.status(200).json({ success: true, message: 'DMCA notice sent successfully' });
  } catch (err) {
    console.error('Nodemailer error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message.includes('535') ? 'Gmail login failed – check app password' : 'Failed to send email' 
    });
  }
};

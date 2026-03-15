// api/index.js   ← keep this filename (with the catch-all rewrite in vercel.json)

require('dotenv').config();
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // Handle only POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Use POST.`
    });
  }

  // Parse body safely
  let bodyData;
  try {
    bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (parseErr) {
    console.error('JSON parse error:', parseErr);
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  const { to, subject, body, forwardTo } = bodyData;

  if (!to || !body) {
    return res.status(400).json({ success: false, error: 'Missing "to" and/or "body"' });
  }

  if (!to.includes('@') || (forwardTo && !forwardTo.includes('@'))) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Create transporter once per invocation (safe in serverless)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    // Add timeout & connection pooling tweaks
    pool: true,
    maxConnections: 1,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  });

  try {
    // Verify connection (helps catch auth/env issues early)
    await transporter.verify();

    // Main send
    await transporter.sendMail({
      from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
      to,
      subject: subject || 'DMCA Takedown Request',
      text: body
    });

    // Forward copy
    if (forwardTo && forwardTo.trim()) {
      await transporter.sendMail({
        from: `"RoDown DMCA Tool" <${process.env.GMAIL_USER}>`,
        to: forwardTo,
        subject: 'Copy: Your DMCA Notice Sent',
        text: `Your request was sent successfully.\n\nOriginal body:\n${body}`
      });
    }

    console.log(`DMCA sent successfully to ${to} (forward: ${forwardTo || 'none'})`);

    res.status(200).json({ success: true, message: 'DMCA notice sent' });
  } catch (err) {
    console.error('Nodemailer failed:', {
      message: err.message,
      code: err.code,
      response: err.response ? err.response : 'No response',
      stack: err.stack ? err.stack.split('\n').slice(0, 3) : ''  // truncate for logs
    });

    // User-friendly error (hide details)
    let userError = 'Failed to send email – server issue';
    if (err.code === 'EAUTH' || err.message.includes('535')) {
      userError = 'Email authentication failed – check GMAIL_USER / GMAIL_APP_PASSWORD';
    } else if (err.message.includes('timeout')) {
      userError = 'Email server timed out – try again later';
    }

    res.status(500).json({ success: false, error: userError });
  }
};

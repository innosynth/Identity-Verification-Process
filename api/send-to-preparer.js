import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { to, pdfUrl, userSignature } = req.body;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: 'Document Signing Request - Action Required',
    html: `
      <p>Please sign the following document: <a href="${process.env.FRONTEND_URL}/sign-pdf/tax-preparer?pdfUrl=${encodeURIComponent(pdfUrl)}&userSignature=${encodeURIComponent(userSignature)}">Sign Document</a></p>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error sending email.' });
  }
} 
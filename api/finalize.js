import { put } from '@vercel/blob';
import { IncomingForm } from 'formidable';
import nodemailer from 'nodemailer';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: 'Error parsing form data' });
      return;
    }
    const { userEmail, preparerEmail } = fields;
    const file = files.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }
    try {
      const data = await fs.promises.readFile(file.filepath);
      const { url } = await put('signed-document.pdf', data, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: [userEmail, preparerEmail],
        subject: 'Signed Document',
        html: `<p>Please find the attached signed document: <a href="${url}">View Document</a></p>`,
      };
      await transporter.sendMail(mailOptions);
      res.status(200).json({ url });
    } catch (error) {
      res.status(500).json({ error: 'Error finalizing document.' });
    }
  });
} 
import { put } from '@vercel/blob';
import { IncomingForm } from 'formidable';
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
      console.error('Form parse error:', err);
      res.status(500).json({ error: 'Error parsing form data' });
      return;
    }
    console.log('Files object:', files);
    let file = files.file;
    if (Array.isArray(file)) {
      file = file[0];
    }
    console.log('file:', file);
    const filePath = file?.filepath || file?.path;
    if (!filePath) {
      console.error('No valid file path found in file:', file);
      res.status(400).json({ error: 'No valid file path for uploaded file.' });
      return;
    }
    console.log('Using file path:', filePath);
    try {
      const data = await fs.promises.readFile(filePath);
      const { url } = await put(file.originalFilename, data, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      res.status(200).json({ url });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Error uploading file.' });
    }
  });
} 
import { IncomingForm } from 'formidable';
import { PDFDocument } from 'pdf-lib';
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
    const pdfFile = files.pdf;
    const signatures = JSON.parse(fields.signatures);
    if (!pdfFile) {
      res.status(400).json({ error: 'No PDF uploaded.' });
      return;
    }
    try {
      const pdfBuffer = await fs.promises.readFile(pdfFile.filepath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      for (const sig of signatures) {
        const pngImage = await pdfDoc.embedPng(sig.imageDataUrl);
        const page = pdfDoc.getPage(sig.page - 1);
        const y = page.getHeight() - sig.y - sig.height;
        page.drawImage(pngImage, {
          x: sig.x,
          y: y,
          width: sig.width,
          height: sig.height,
        });
        const metadataText = `Signed by: ${sig.name}\nIP Address: ${sig.ipAddress}\nDate: ${new Date(sig.timestamp).toLocaleString()}`;
        page.drawText(metadataText, {
          x: sig.x,
          y: y - 40,
          size: 8,
          lineHeight: 10,
          maxWidth: 200,
        });
      }
      const signedPdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.send(Buffer.from(signedPdfBytes));
    } catch (error) {
      res.status(500).json({ error: 'Failed to sign PDF' });
    }
  });
} 
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { put, del } = require('@vercel/blob');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Add your credentials here
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

transporter.verify(function(error, success) {
  if (error) {
    console.error("Error with nodemailer transport:", error);
  } else {
    console.log("Nodemailer transport is ready to send emails");
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const { url } = await put(req.file.originalname, req.file.buffer, {
      access: 'public',
      token: BLOB_READ_WRITE_TOKEN,
    });
    res.json({ url });
  } catch (error) {
    console.error('Error uploading to blob storage:', error);
    res.status(500).send('Error uploading file.');
  }
});

app.post('/api/send-to-preparer', async (req, res) => {
    const { to, pdfUrl, userSignature } = req.body;
  
    const mailOptions = {
      from: GMAIL_USER,
      to,
      subject: 'Document Signing Request - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document Signing Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .info-box { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Signing Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have received a request to sign a document. Please review and sign the document at your earliest convenience.</p>
              
              <div class="info-box">
                <p><strong>Sender:</strong> ${GMAIL_USER}</p>
                <p><strong>Document:</strong> PDF Document</p>
                <p><strong>Action Required:</strong> Please sign the document</p>
              </div>
              
              <p>Click the button below to access and sign the document:</p>
              <a href="${process.env.FRONTEND_URL}/sign-pdf/tax-preparer?pdfUrl=${encodeURIComponent(pdfUrl)}&userSignature=${encodeURIComponent(userSignature)}" class="button">Sign Document</a>
              
              <p>If the button doesn't work, please copy and paste the following link into your browser:</p>
              <p>${process.env.FRONTEND_URL}/sign-pdf/tax-preparer?pdfUrl=${encodeURIComponent(pdfUrl)}&userSignature=${encodeURIComponent(userSignature)}</p>
              
              <p>If you have any questions or concerns, please contact the sender.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} Document Signing Service. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  
    try {
      await transporter.sendMail(mailOptions);
      res.status(200).send('Email sent successfully.');
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Error sending email.');
    }
});

app.post('/api/finalize', upload.single('file'), async (req, res) => {
    const { userEmail, preparerEmail } = req.body;

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const { url } = await put('signed-document.pdf', req.file.buffer, {
            access: 'public',
            token: BLOB_READ_WRITE_TOKEN,
        });

        const mailOptions = {
            from: GMAIL_USER,
            to: [userEmail, preparerEmail],
            subject: 'Document Signed - Your Copy',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Document Signed</title>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #d4edda; padding: 20px; text-align: center; border-radius: 5px; }
                  .content { padding: 20px 0; }
                  .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                  .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                  .info-box { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Document Successfully Signed</h1>
                  </div>
                  <div class="content">
                    <p>Hello,</p>
                    <p>The document has been successfully signed by all parties. Please find your copy of the signed document attached.</p>
                    
                    <div class="info-box">
                      <p><strong>Sender:</strong> ${GMAIL_USER}</p>
                      <p><strong>Document Status:</strong> Signed and Completed</p>
                      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <p>You can view and download the signed document by clicking the button below:</p>
                    <a href="${url}" class="button">View Signed Document</a>
                    
                    <p>If the button doesn't work, please copy and paste the following link into your browser:</p>
                    <p>${url}</p>
                    
                    <p><strong>Document Details:</strong></p>
                    <ul>
                      <li>All signatures include metadata (signer name, IP address, and timestamp)</li>
                      <li>Document is securely stored and accessible via the link above</li>
                    </ul>
                    
                    <p>Thank you for using our document signing service.</p>
                  </div>
                  <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>© ${new Date().getFullYear()} Document Signing Service. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ url });
    } catch (error) {
        console.error('Error finalizing document:', error);
        res.status(500).send('Error finalizing document.');
    }
});

app.post('/api/sign-pdf', upload.fields([
  { name: 'pdf', maxCount: 1 },
]), async (req, res) => {
  try {
    const pdfBuffer = req.files['pdf'][0].buffer;
    const signatures = JSON.parse(req.body.signatures); // [{ page, x, y, imageDataUrl, width, height, name, ipAddress, timestamp }, ...]
    
    // Debug logging
    console.log('Received signatures data:', JSON.stringify(signatures, null, 2));

    const pdfDoc = await PDFDocument.load(pdfBuffer);

    for (const sig of signatures) {
      console.log('Processing signature:', JSON.stringify(sig, null, 2));
      
      const pngImage = await pdfDoc.embedPng(sig.imageDataUrl);
      const page = pdfDoc.getPage(sig.page - 1);
      
      const y = page.getHeight() - sig.y - sig.height; // pdf-lib uses bottom-left origin

      page.drawImage(pngImage, {
        x: sig.x,
        y: y,
        width: sig.width,
        height: sig.height,
      });

      // Create a more detailed metadata text with better positioning
      const metadataText = `
Signed by: ${sig.name}
IP Address: ${sig.ipAddress}
Date: ${new Date(sig.timestamp).toLocaleString()}
      `.trim();
      
      // Get page dimensions for better positioning
      const pageHeight = page.getHeight();
      const pageWidth = page.getWidth();
      
      // Position the text below the signature with better visibility
      const textY = Math.max(20, y - 50); // Ensure text doesn't go below page
      const textX = Math.min(sig.x, pageWidth - 200); // Ensure text doesn't go beyond page width
      
      console.log('Drawing metadata text at position:', { x: textX, y: textY });
      console.log('Metadata text content:', metadataText);
      
      page.drawText(metadataText, {
        x: textX,
        y: textY,
        size: 8,
        lineHeight: 10,
        maxWidth: 200,
      });
    }

    const signedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(signedPdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to sign PDF');
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
}); 
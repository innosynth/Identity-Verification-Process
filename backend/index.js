require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: 'postgres://neondb_owner:npg_cIXh26JjLvws@ep-orange-star-aensj8ao-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});

// Blob storage setup (using Vercel Blob via a custom approach or direct API if supported)
// For now, we'll simulate blob storage interaction as Vercel Blob specifics may vary
const BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_HePegez0gyY8GRwS_VS3T1DssMAoZctZriMRbjbmyX85vjl';
// Placeholder for blob storage client setup
// In a real scenario, we'd use a compatible client or API for Vercel Blob

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Function to create database tables if they don't exist
const createTables = async () => {
  try {
    console.log('Creating database tables if they do not exist...');
    
    // Create recipients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Recipients table created or already exists.');

    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER REFERENCES recipients(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Documents table created or already exists.');

    // Create envelopes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS envelopes (
        id VARCHAR(255) PRIMARY KEY,
        recipient_id INTEGER REFERENCES recipients(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Envelopes table created or already exists.');

    // Create signatures table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signatures (
        id SERIAL PRIMARY KEY,
        envelope_id VARCHAR(255) REFERENCES envelopes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        data TEXT NOT NULL,
        signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Signatures table created or already exists.');

    // Create signing_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signing_tokens (
        id SERIAL PRIMARY KEY,
        envelope_id VARCHAR(255) REFERENCES envelopes(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Signing tokens table created or already exists.');

    // Create webhooks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Webhooks table created or already exists.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

// Call createTables function on server startup
createTables();

// Endpoint for uploading documents and saving recipient data
app.post('/api/upload', upload.array('documents'), async (req, res) => {
  const { recipientName, recipientEmail } = req.body;
  const files = req.files;

  if (!recipientName || !recipientEmail || !files || files.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or documents' });
  }

  try {
    // Save recipient data to database
    const recipientQuery = 'INSERT INTO recipients (name, email) VALUES ($1, $2) RETURNING id';
    const recipientResult = await pool.query(recipientQuery, [recipientName, recipientEmail]);
    const recipientId = recipientResult.rows[0].id;

    // Save files to Vercel Blob storage
    const documentUrls = [];
    for (const file of files) {
      // Placeholder for uploading to Vercel Blob
      // Using the BLOB_READ_WRITE_TOKEN for authentication simulation
      console.log(`Uploading file to Vercel Blob: ${file.originalname}`);
      // In a real scenario, use an HTTP request or SDK with the token
      // For now, simulate a URL
      const blobUrl = `https://vercel-blob-simulated/${Date.now()}-${file.originalname}`;
      documentUrls.push(blobUrl);

      // Save document metadata to database
      const docQuery = 'INSERT INTO documents (recipient_id, filename, url) VALUES ($1, $2, $3)';
      await pool.query(docQuery, [recipientId, file.originalname, blobUrl]);
    }

    // Create an envelope for the uploaded documents
    const envelopeId = `ENV-${Date.now()}`;
    const envelopeQuery = 'INSERT INTO envelopes (id, recipient_id, status) VALUES ($1, $2, $3)';
    await pool.query(envelopeQuery, [envelopeId, recipientId, 'pending']);

    res.status(201).json({
      message: 'Documents uploaded and envelope created successfully',
      envelopeId,
      recipientId,
      documentUrls
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Basic endpoint to check server status
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Endpoint to get envelope status
app.get('/api/envelope/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }
    const envelope = envelopeResult.rows[0];
    
    // Get associated recipient and documents
    const recipientQuery = 'SELECT * FROM recipients WHERE id = $1';
    const recipientResult = await pool.query(recipientQuery, [envelope.recipient_id]);
    const documentsQuery = 'SELECT * FROM documents WHERE recipient_id = $1';
    const documentsResult = await pool.query(documentsQuery, [envelope.recipient_id]);
    const signaturesQuery = 'SELECT * FROM signatures WHERE envelope_id = $1';
    const signaturesResult = await pool.query(signaturesQuery, [id]);
    
    res.status(200).json({
      envelope: {
        ...envelope,
        recipient: recipientResult.rows[0],
        documents: documentsResult.rows,
        signatures: signaturesResult.rows
      }
    });
    } catch (error) {
    console.error('Error fetching envelope:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to update identity verification results
app.post('/api/envelope/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { nameVerified, faceVerified } = req.body;
  try {
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    // Update verification status
    const status = nameVerified && faceVerified ? 'verified' : 'verification_failed';
    const updateQuery = 'UPDATE envelopes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await pool.query(updateQuery, [status, id]);

    // Trigger webhook for verification event
    await triggerWebhooks('verification_update', {
      envelopeId: id,
      status,
      nameVerified,
      faceVerified
    });

    res.status(200).json({ message: 'Verification status updated', status });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to generate a signing link for the recipient with a secure token
app.get('/api/envelope/:id/signing-link', async (req, res) => {
  const { id } = req.params;
  try {
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }
    const envelope = envelopeResult.rows[0];

    if (envelope.status !== 'verified' && envelope.status !== 'prepared') {
      return res.status(403).json({ error: 'Envelope not ready for signing' });
    }

    // Generate a unique token for the signing link
    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Link expires in 24 hours

    // Store the token in the database
    const tokenQuery = 'INSERT INTO signing_tokens (envelope_id, token, expires_at) VALUES ($1, $2, $3)';
    await pool.query(tokenQuery, [id, token, expiresAt]);

    // Generate the signing link with the token
    const signingLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign-pdf/${id}?token=${token}`;
    res.status(200).json({ signingLink, expiresAt });
  } catch (error) {
    console.error('Error generating signing link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to update envelope status after signing or other actions
app.post('/api/envelope/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, signatureType, signatureData } = req.body;
  try {
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    // Update envelope status
    const updateQuery = 'UPDATE envelopes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await pool.query(updateQuery, [status, id]);

    // If signature data is provided, store it
    if (signatureType && signatureData) {
      const signatureQuery = 'INSERT INTO signatures (envelope_id, type, data) VALUES ($1, $2, $3)';
      await pool.query(signatureQuery, [id, signatureType, signatureData]);
    }

    // Trigger webhook for status update event
    await triggerWebhooks('status_update', {
      envelopeId: id,
      status
    });

    res.status(200).json({ message: 'Envelope status updated', status });
  } catch (error) {
    console.error('Error updating envelope status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to prepare documents in an envelope for signing
app.post('/api/envelope/:id/prepare', async (req, res) => {
  const { id } = req.params;
  try {
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }
    const envelope = envelopeResult.rows[0];

    if (envelope.status !== 'verified') {
      return res.status(403).json({ error: 'Envelope not verified for preparation' });
    }

    // Simulate document preparation (e.g., adding signature fields)
    // In a real scenario, this would involve processing PDFs to add signature placeholders
    const documentsQuery = 'SELECT * FROM documents WHERE recipient_id = $1';
    const documentsResult = await pool.query(documentsQuery, [envelope.recipient_id]);
    const preparedDocuments = documentsResult.rows.map(doc => ({
      ...doc,
      prepared: true,
      signature_fields: [{ page: 1, x: 100, y: 100, width: 200, height: 50 }]
    }));

    // Update envelope status to prepared
    const updateQuery = 'UPDATE envelopes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await pool.query(updateQuery, ['prepared', id]);

    // Simulate storing prepared document metadata (in a real scenario, update document records)
    console.log('Documents prepared for signing:', preparedDocuments.map(doc => doc.filename));

    res.status(200).json({
      message: 'Documents prepared for signing',
      envelopeId: id,
      preparedDocuments: preparedDocuments.map(doc => ({ id: doc.id, filename: doc.filename }))
    });
  } catch (error) {
    console.error('Error preparing documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for server-side document name verification
app.post('/api/verify/document-name', upload.single('documentImage'), async (req, res) => {
  const { recipientName } = req.body;
  const file = req.file;

  if (!recipientName || !file) {
    return res.status(400).json({ error: 'Missing recipient name or document image' });
  }

  try {
    // Placeholder for server-side document name verification
    // In a real scenario, use a robust OCR library or service (e.g., AWS Textract, Google Vision API)
    console.log(`Verifying document for name: ${recipientName}`);
    // Simulate verification result (replace with actual OCR processing)
    const nameVerified = true; // Simulated result

    res.status(200).json({ nameVerified });
  } catch (error) {
    console.error('Error verifying document name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for server-side facial recognition
app.post('/api/verify/face', upload.fields([{ name: 'selfieImage', maxCount: 1 }, { name: 'documentImage', maxCount: 1 }]), async (req, res) => {
  const files = req.files;

  if (!files['selfieImage'] || !files['documentImage']) {
    return res.status(400).json({ error: 'Missing selfie or document image' });
  }

  try {
    // Placeholder for server-side facial recognition
    // In a real scenario, use a robust facial recognition service (e.g., AWS Rekognition, Microsoft Face API)
    console.log('Verifying face match between selfie and document image');
    // Simulate verification result (replace with actual facial recognition processing)
    const faceVerified = true; // Simulated result

    res.status(200).json({ faceVerified });
  } catch (error) {
    console.error('Error verifying face match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to register a webhook for event notifications
app.post('/api/webhook/register', async (req, res) => {
  const { url, events } = req.body;

  if (!url || !events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Missing webhook URL or events array' });
  }

  try {
    // Store webhook registration in database
    const webhookQuery = 'INSERT INTO webhooks (url, events) VALUES ($1, $2) RETURNING id';
    const webhookResult = await pool.query(webhookQuery, [url, events]);
    const webhookId = webhookResult.rows[0].id;

    res.status(201).json({
      message: 'Webhook registered successfully',
      webhookId
    });
  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to trigger webhook notifications for events
const triggerWebhooks = async (eventType, data) => {
  try {
    // Fetch all webhooks that are subscribed to this event type
    const webhookQuery = 'SELECT * FROM webhooks WHERE $1 = ANY(events)';
    const webhookResult = await pool.query(webhookQuery, [eventType]);

    for (const webhook of webhookResult.rows) {
      console.log(`Triggering webhook for ${eventType} to ${webhook.url}`);
      // In a real scenario, use a library like axios to send HTTP POST request to webhook URL
      // For now, simulate the notification
      console.log(`Webhook notification: ${JSON.stringify({ event: eventType, data })}`);
      // Placeholder for actual HTTP request to webhook.url with payload { event: eventType, data }
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 
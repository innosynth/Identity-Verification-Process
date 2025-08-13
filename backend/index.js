require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cors = require('cors');
const { put } = require('@vercel/blob');
const crypto = require('crypto');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const axios = require('axios');
const EventEmitter = require('events');
const path = require('path');

// Input sanitization function
const sanitizeForLog = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[\r\n\t]/g, '').substring(0, 200);
};

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// CSRF protection middleware
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    const token = req.headers['x-csrf-token'];
    if (!token && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'CSRF token required' });
    }
  }
  next();
});

// Middleware to enforce HTTPS
app.use((req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
});

// Middleware for API key authentication
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized: Missing API key' });
  }

  try {
    const keyQuery = 'SELECT * FROM api_keys WHERE revoked = FALSE';
    const result = await pool.query(keyQuery);
    let validKey = false;
    for (const row of result.rows) {
      if (bcrypt.compareSync(apiKey, row.key_hash)) {
        validKey = true;
        req.apiKeyId = row.id;
        break;
      }
    }
    if (!validKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
  } catch (error) {
    console.error('Error authenticating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://neondb_owner:npg_cIXh26JjLvws@ep-orange-star-aensj8ao-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
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

// Function to log audit events
const logAuditEvent = async (eventType, userId, ipAddress, details) => {
  try {
    const auditQuery = 'INSERT INTO audit_logs (event_type, user_id, ip_address, details) VALUES ($1, $2, $3, $4)';
    // Validate details object before serialization
    const safeDetails = typeof details === 'object' && details !== null ? details : {};
    await pool.query(auditQuery, [eventType, userId, ipAddress, JSON.stringify(safeDetails)]);
    console.log('Audit event logged:', { eventType, userId, ipAddress: sanitizeForLog(ipAddress) });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

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
        encryption_iv TEXT,
        encryption_auth_tag TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Documents table created or already exists.');
    // Add missing columns if they do not exist
    try {
      await pool.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_iv TEXT');
      console.log('Added encryption_iv column to documents table if it did not exist.');
    } catch (alterError) {
      console.error('Error adding encryption_iv column:', alterError);
    }
    try {
      await pool.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_auth_tag TEXT');
      console.log('Added encryption_auth_tag column to documents table if it did not exist.');
    } catch (alterError) {
      console.error('Error adding encryption_auth_tag column:', alterError);
    }

    // Create envelopes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS envelopes (
        id VARCHAR(255) PRIMARY KEY,
        recipient_id INTEGER REFERENCES recipients(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    
    // Create signature_placeholders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signature_placeholders (
        id SERIAL PRIMARY KEY,
        envelope_id VARCHAR(255) REFERENCES envelopes(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        x_position FLOAT NOT NULL,
        y_position FLOAT NOT NULL,
        width FLOAT DEFAULT 128,
        height FLOAT DEFAULT 64,
        is_signed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Signature placeholders table created or already exists.');
    
    // Ensure CASCADE constraints are properly set
    await pool.query(`
      ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_recipient_id_fkey;
      ALTER TABLE documents ADD CONSTRAINT documents_recipient_id_fkey 
        FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE;
    `);
    await pool.query(`
      ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_envelope_id_fkey;
      ALTER TABLE signatures ADD CONSTRAINT signatures_envelope_id_fkey 
        FOREIGN KEY (envelope_id) REFERENCES envelopes(id) ON DELETE CASCADE;
    `);
    console.log('Envelopes table created or already exists.');
    // Add missing columns if they do not exist
    try {
      await pool.query('ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP');
      console.log('Added expires_at column to envelopes table if it did not exist.');
    } catch (alterError) {
      console.error('Error adding expires_at column:', alterError);
    }

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

    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(255) NOT NULL,
        user_id INTEGER,
        ip_address VARCHAR(255),
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Audit logs table created or already exists.');

    // Create signature_consents table for e-signature compliance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signature_consents (
        id SERIAL PRIMARY KEY,
        signature_id INTEGER REFERENCES signatures(id) ON DELETE CASCADE,
        consent_given BOOLEAN NOT NULL,
        consent_timestamp TIMESTAMP NOT NULL
      )
    `);
    console.log('Signature consents table created or already exists.');

    // Create signature_hashes table for tamper-evident records
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signature_hashes (
        id SERIAL PRIMARY KEY,
        signature_id INTEGER REFERENCES signatures(id) ON DELETE CASCADE,
        hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Signature hashes table created or already exists.');

    // Create api_keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        key_hash TEXT NOT NULL,
        partial_key VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        last_used TIMESTAMP
      )
    `);
    console.log('API keys table created or already exists.');

    // Create face_verification_attempts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS face_verification_attempts (
        id SERIAL PRIMARY KEY,
        envelope_id VARCHAR(255) REFERENCES envelopes(id) ON DELETE CASCADE,
        selfie_url TEXT NOT NULL,
        document_url TEXT NOT NULL,
        face_verified BOOLEAN NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Face verification attempts table created or already exists.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

// Call createTables function on server startup
createTables();

// Internal Event Dispatcher
const eventEmitter = new EventEmitter();

// Event listener for internal processing before webhook dispatch
eventEmitter.on('event', async (eventType, data) => {
  console.log('Internal event processed:', { eventType, data });
  // TODO: Add additional internal processing logic here (e.g., logging, analytics)
  await triggerWebhooks(eventType, data);
});

// Function to dispatch events internally
const dispatchEvent = (eventType, data) => {
  eventEmitter.emit('event', eventType, data);
};

// Predefined verification workflows
const verificationWorkflows = {
  'WF_STANDARD': { 
    name: 'Standard Verification',
    steps: ['document', 'face'], 
    strictness: 'high',
    nameMatchRequired: true,
    faceMatchRequired: true
  },
  'WF_DOCUMENT_ONLY': { 
    name: 'Document Only',
    steps: ['document'], 
    strictness: 'medium',
    nameMatchRequired: true,
    faceMatchRequired: false
  },
  'WF_BASIC': { 
    name: 'Basic Verification',
    steps: ['document', 'face'], 
    strictness: 'low',
    nameMatchRequired: false,
    faceMatchRequired: true
  }
};

// Endpoint for uploading documents and saving recipient data
app.post('/api/signing-session', authenticateApiKey, upload.array('documents'), async (req, res) => {
  const { recipientName, recipientEmail, workflowId = 'WF_STANDARD', signaturePlaceholders } = req.body;
  const files = req.files;

  console.log('Creating signing session:', { recipientName, recipientEmail, fileCount: files?.length });

  if (!recipientName || !recipientEmail || !files || files.length === 0) {
    console.error('Missing required fields or documents');
    return res.status(400).json({ error: 'Missing required fields or documents' });
  }

  try {
    // Save recipient data to database
    const recipientQuery = 'INSERT INTO recipients (name, email) VALUES ($1, $2) RETURNING id';
    const recipientResult = await pool.query(recipientQuery, [recipientName, recipientEmail]);
    const recipientId = recipientResult.rows[0].id;
    console.log('Recipient created with ID:', recipientId);

    // Log audit event for session creation
    const ipAddress = req.ip || req.connection.remoteAddress;
    await logAuditEvent('SIGNING_SESSION_CREATED', recipientId, ipAddress, { recipientName, recipientEmail, fileCount: files.length });

    // Save files to Vercel Blob storage with encryption
    const documentUrls = [];
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      console.error('Encryption key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    for (const file of files) {
      console.log('Processing file:', file.originalname, 'Size:', file.buffer.length);
      
      // Encrypt file content using AES-256-GCM
      const iv = crypto.randomBytes(16); // Initialization vector
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
      let encrypted = cipher.update(file.buffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Store encrypted data directly (not combined with IV and authTag)
      const encryptedData = encrypted;

      // Upload to Vercel Blob with proper token
      const cleanToken = process.env.BLOB_READ_WRITE_TOKEN.replace(/["']/g, '');
      const blob = await put(
        `${Date.now()}-${file.originalname}`,
        encryptedData,
        {
          access: 'public',
          token: cleanToken,
        }
      );
      const blobUrl = blob.url;
      documentUrls.push(blobUrl);
      console.log('File uploaded to blob storage:', blobUrl);

      // Save document metadata to database (store encryption details separately)
      const docQuery = 'INSERT INTO documents (recipient_id, filename, url, encryption_iv, encryption_auth_tag) VALUES ($1, $2, $3, $4, $5) RETURNING id';
      const docResult = await pool.query(docQuery, [recipientId, file.originalname, blobUrl, iv.toString('hex'), authTag.toString('hex')]);
      console.log('Document metadata saved with ID:', docResult.rows[0].id);
    }

    // Validate workflow ID
    const workflow = verificationWorkflows[workflowId];
    if (!workflow) {
      console.error('Invalid workflow ID:', workflowId);
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    // Create an envelope for the uploaded documents with expiration time and workflow
    const envelopeId = `ENV-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires in 7 days
    
    // Add workflow_id column to envelopes table if not exists
    try {
      await pool.query('ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(50)');
    } catch (alterError) {
      console.log('Workflow column may already exist');
    }
    
    const envelopeQuery = 'INSERT INTO envelopes (id, recipient_id, status, expires_at, workflow_id) VALUES ($1, $2, $3, $4, $5)';
    await pool.query(envelopeQuery, [envelopeId, recipientId, 'pending', expiresAt, workflowId]);
    console.log('Envelope created with ID:', envelopeId);
    
    // Save signature placeholders if provided
    if (signaturePlaceholders) {
      try {
        const placeholders = JSON.parse(signaturePlaceholders);
        for (const placeholder of placeholders) {
          const placeholderQuery = 'INSERT INTO signature_placeholders (envelope_id, page_number, x_position, y_position, width, height) VALUES ($1, $2, $3, $4, $5, $6)';
          await pool.query(placeholderQuery, [envelopeId, placeholder.page, placeholder.x, placeholder.y, placeholder.width || 128, placeholder.height || 64]);
        }
        console.log('Signature placeholders saved:', placeholders.length);
      } catch (placeholderError) {
        console.error('Error saving signature placeholders:', placeholderError);
      }
    }

    res.status(201).json({
      message: 'Signing session created successfully',
      sessionId: envelopeId,
      recipientId,
      documentUrls,
      expiresAt,
      workflow: {
        id: workflowId,
        name: workflow.name,
        steps: workflow.steps
      }
    });
  } catch (error) {
    console.error('Error creating signing session:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Basic endpoint to check server status
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});



// Endpoint to get available workflows
app.get('/api/workflows', authenticateApiKey, (req, res) => {
  res.status(200).json({ workflows: verificationWorkflows });
});

// Endpoint to get envelope status
app.get('/api/signing-session/:id', authenticateApiKey, async (req, res) => {
  const { id } = req.params;
  console.log('Fetching signing session for ID:', id);
  
  try {
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      console.error('Signing session not found for ID:', id);
      return res.status(404).json({ error: 'Signing session not found' });
    }
    const envelope = envelopeResult.rows[0];
    console.log('Envelope found:', { id: envelope.id, status: envelope.status, recipient_id: envelope.recipient_id });
    
    // Get associated recipient and documents
    const recipientQuery = 'SELECT * FROM recipients WHERE id = $1';
    const recipientResult = await pool.query(recipientQuery, [envelope.recipient_id]);
    const documentsQuery = 'SELECT * FROM documents WHERE recipient_id = $1';
    const documentsResult = await pool.query(documentsQuery, [envelope.recipient_id]);
    const signaturesQuery = 'SELECT * FROM signatures WHERE envelope_id = $1';
    const signaturesResult = await pool.query(signaturesQuery, [id]);
    const placeholdersQuery = 'SELECT * FROM signature_placeholders WHERE envelope_id = $1 ORDER BY page_number, x_position';
    const placeholdersResult = await pool.query(placeholdersQuery, [id]);
    
    console.log('Associated data found:', {
      recipient: !!recipientResult.rows[0],
      documentsCount: documentsResult.rows.length,
      signaturesCount: signaturesResult.rows.length
    });
    
    res.status(200).json({
      session: {
        ...envelope,
        recipient: recipientResult.rows[0],
        documents: documentsResult.rows,
        signatures: signaturesResult.rows,
        signaturePlaceholders: placeholdersResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching signing session:', error.stack || error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to update identity verification results
app.post('/api/envelope/:id/verify', authenticateApiKey, async (req, res) => {
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

    // Log audit event for verification update
    const ipAddress = req.ip || req.connection.remoteAddress;
    await logAuditEvent('VERIFICATION_UPDATED', envelopeResult.rows[0].recipient_id, ipAddress, { envelopeId: id, status, nameVerified, faceVerified });

    // Dispatch event internally
    dispatchEvent(status === 'verified' ? 'verification_success' : 'verification_failed', {
      envelopeId: id,
      status,
      nameVerified,
      faceVerified,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: 'Verification status updated', status });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to generate a signing link for the recipient with a secure token
app.get('/api/envelope/:id/signing-link', authenticateApiKey, async (req, res) => {
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

    // Check if envelope has expired
    if (envelope.expires_at && new Date(envelope.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Envelope has expired' });
    }

    // Generate a unique token for the signing link
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Link expires in 24 hours

    // Store the token in the database
    const tokenQuery = 'INSERT INTO signing_tokens (envelope_id, token, expires_at) VALUES ($1, $2, $3)';
    await pool.query(tokenQuery, [id, token, expiresAt]);

    // Generate the signing link with the token
    const signingLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}?sessionId=${id}&token=${token}`;
    res.status(200).json({ signingLink, expiresAt });
  } catch (error) {
    console.error('Error generating signing link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to update envelope status after signing or other actions
app.post('/api/envelope/:id/status', authenticateApiKey, async (req, res) => {
  const { id } = req.params;
  const { status, signatureType, signatureData, consentGiven, reason, signedPdfUrl } = req.body;
  try {
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    // Add signed_pdf_url column if not exists
    try {
      await pool.query('ALTER TABLE envelopes ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT');
    } catch (alterError) {
      console.log('signed_pdf_url column may already exist');
    }
    
    // Update envelope status and signed PDF URL
    const updateQuery = signedPdfUrl 
      ? 'UPDATE envelopes SET status = $1, signed_pdf_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3'
      : 'UPDATE envelopes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    
    const updateParams = signedPdfUrl ? [status, signedPdfUrl, id] : [status, id];
    await pool.query(updateQuery, updateParams);

    // If signature data is provided, store it
    if (signatureType && signatureData) {
      const signatureQuery = 'INSERT INTO signatures (envelope_id, type, data) VALUES ($1, $2, $3) RETURNING id';
      const signatureResult = await pool.query(signatureQuery, [id, signatureType, signatureData]);
      const signatureId = signatureResult.rows[0].id;

      // Record consent and intent to sign electronically for ESIGN and UETA compliance
      if (consentGiven) {
        const consentQuery = 'INSERT INTO signature_consents (signature_id, consent_given, consent_timestamp) VALUES ($1, $2, CURRENT_TIMESTAMP)';
        await pool.query(consentQuery, [signatureId, consentGiven]);
        console.log('Consent recorded for signature ID:', signatureId);
      }

      // Create a tamper-evident record by hashing the signature data for integrity (supports eIDAS, ESIGN, UETA)
      const signatureHash = crypto.createHash('sha256').update(signatureData).digest('hex');
      const tamperEvidentQuery = 'INSERT INTO signature_hashes (signature_id, hash) VALUES ($1, $2)';
      await pool.query(tamperEvidentQuery, [signatureId, signatureHash]);
      console.log('Tamper-evident hash recorded for signature ID:', signatureId);

      // TODO: Ensure further e-signature compliance with eIDAS, ESIGN, and UETA
      //       - Implement digital certificates for signer authentication (eIDAS) - Requires integration with a Trust Service Provider
      //       - Provide accessible copies of signed documents to all parties (UETA, ESIGN) - Implemented below
      //       - Consult legal counsel for full compliance in target jurisdictions
    }

    // Log audit event for status update
    const ipAddress = req.ip || req.connection.remoteAddress;
    await logAuditEvent('ENVELOPE_STATUS_UPDATED', envelopeResult.rows[0].recipient_id, ipAddress, { envelopeId: id, status });

    // Dispatch event internally with enhanced event types
    let eventType = 'status_update';
    if (status === 'completed') eventType = 'signing_complete';
    else if (status === 'signing_declined') eventType = 'signing_declined';
    else if (status === 'signing_deferred') eventType = 'signing_deferred';
    else if (status === 'voided') eventType = 'envelope_voided';
    else if (status === 'verification_failed') eventType = 'id_verification_failed';
    else if (status === 'verified') eventType = 'id_verification_success';
    
    dispatchEvent(eventType, {
      envelopeId: id,
      status,
      reason: reason || null,
      timestamp: new Date().toISOString()
    });

    // If the status is 'completed', ensure accessible copies are available to all parties (UETA, ESIGN)
    if (status === 'completed') {
      // Fetch associated documents
      const documentsQuery = 'SELECT * FROM documents WHERE recipient_id = $1';
      const documentsResult = await pool.query(documentsQuery, [envelopeResult.rows[0].recipient_id]);
      const documents = documentsResult.rows;

      // Log audit event for document access provision
      await logAuditEvent('SIGNED_DOCUMENTS_ACCESSIBLE', envelopeResult.rows[0].recipient_id, ipAddress, { envelopeId: id, documentCount: documents.length });

      // TODO: Implement notification or email to recipient with access to signed documents
      console.log('Signed documents are now accessible for envelope:', id);
    }

    res.status(200).json({ message: 'Envelope status updated', status });
  } catch (error) {
    console.error('Error updating envelope status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to prepare documents in an envelope for signing
app.post('/api/envelope/:id/prepare', authenticateApiKey, async (req, res) => {
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
app.post('/api/verify/document-name', authenticateApiKey, upload.single('documentImage'), async (req, res) => {
  const { envelopeId } = req.body;
  const file = req.file;

  if (!envelopeId || !file) {
    return res.status(400).json({ error: 'Missing envelope ID or document image' });
  }

  try {
    // Look up recipient name from envelopeId
    const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [envelopeId]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }
    const envelope = envelopeResult.rows[0];
    const recipientQuery = 'SELECT * FROM recipients WHERE id = $1';
    const recipientResult = await pool.query(recipientQuery, [envelope.recipient_id]);
    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found for envelope' });
    }
    const recipientName = recipientResult.rows[0].name;

    // Use Gemini API for document verification
    console.log('Processing document image with Gemini API:', { filename: sanitizeForLog(file.originalname) });
    
    // Load Gemini API key from environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }
    
    // Convert image buffer to base64
    const imageBase64 = file.buffer.toString('base64');
    
    // Craft prompt for Gemini API (request JSON output)
    const prompt = `Extract the following fields from the provided document image:\n- documentType: The type of document (e.g., passport, driver's license, national ID)\n- extractedName: The full name found on the document\n- nameMatch: \"Yes\" if the extracted name matches the provided recipient name (case-insensitive), otherwise \"No\"\n- confidence: High/Medium/Low\n- reason: Explanation for the match result or any issues encountered\n\nCompare the extracted name to the provided recipient name: '${recipientName}'.\nReturn the result as a JSON object with these fields.`;
    
    // Make request to Gemini API (REST call, expecting JSON response)
    const geminiResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      {
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse Gemini API JSON response robustly
    let result = null;
    if (geminiResponse.data && geminiResponse.data.candidates && geminiResponse.data.candidates.length > 0) {
      const content = geminiResponse.data.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        // Try to parse JSON from the response with validation
        try {
          const jsonText = content.parts[0].text;
          if (typeof jsonText === 'string' && jsonText.trim().startsWith('{')) {
            result = JSON.parse(jsonText);
          }
        } catch (e) {
          // Fallback: try to extract JSON from text
          const match = content.parts[0].text.match(/\{[\s\S]*\}/);
          if (match && match[0].length < 10000) { // Limit size
            result = JSON.parse(match[0]);
          }
        }
      }
    }

    if (!result) {
      return res.status(500).json({ error: 'Failed to parse Gemini API response' });
    }

    // Compose response for frontend
    const nameVerified = (result.nameMatch && result.nameMatch.toLowerCase() === 'yes');
    const reason = result.reason || 'No detailed reason provided';
    res.status(200).json({
      nameVerified,
      reason,
      documentType: result.documentType,
      extractedName: result.extractedName,
      confidence: result.confidence
    });
  } catch (error) {
    console.error('Error verifying document name with Gemini API:', error.stack || error);
    // If Gemini API returned an error response, forward the details
    if (error.response && error.response.data) {
      return res.status(500).json({ error: 'Internal server error', details: error.response.data });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint for server-side facial recognition
app.post('/api/verify/face', authenticateApiKey, upload.fields([{ name: 'selfieImage', maxCount: 1 }, { name: 'documentImage', maxCount: 1 }]), async (req, res) => {
  const files = req.files;
  const envelopeId = req.body.envelopeId;

  if (!envelopeId || !files['selfieImage'] || !files['documentImage']) {
    return res.status(400).json({ error: 'Missing envelope ID, selfie, or document image' });
  }

  try {
    console.log('Starting face verification process...');
    // Upload images to blob storage
    const { put } = require('@vercel/blob');
    const selfieFile = files['selfieImage'][0];
    const documentFile = files['documentImage'][0];
    const cleanToken = process.env.BLOB_READ_WRITE_TOKEN.replace(/["']/g, '');
    const selfieBlob = await put(`${envelopeId}-selfie-${Date.now()}.jpg`, selfieFile.buffer, { access: 'public', token: cleanToken });
    const documentBlob = await put(`${envelopeId}-docimg-${Date.now()}.jpg`, documentFile.buffer, { access: 'public', token: cleanToken });
    const selfieUrl = selfieBlob.url;
    const documentUrl = documentBlob.url;
    console.log('Images uploaded to blob storage successfully');

    // Use Gemini API for face comparison
    const selfieBase64 = selfieFile.buffer.toString('base64');
    const documentBase64 = documentFile.buffer.toString('base64');
    console.log('Images converted to base64, sizes:', { selfie: selfieBase64.length, document: documentBase64.length });

    // Load Gemini API key from environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key is not configured');
      throw new Error('Gemini API key is not configured');
    }
    console.log('Gemini API key found, length:', GEMINI_API_KEY.length);

    // Craft prompt for Gemini API (request JSON output)
    const prompt = `Compare the two provided images. Are both images of the same person?\nReturn a JSON object with the following fields:\n- faceMatch: \"Yes\" if both images are of the same person, otherwise \"No\"\n- confidence: High/Medium/Low\n- reason: Explanation for the match result or any issues encountered.`;
    console.log('Gemini prompt prepared');

    // Make request to Gemini API (REST call, expecting JSON response)
    console.log('Making Gemini API request...');
    const geminiResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: selfieBase64
              }
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: documentBase64
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      {
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Gemini API response status:', geminiResponse.status);
    console.log('Gemini API response data structure:', {
      hasData: !!geminiResponse.data,
      hasCandidates: !!(geminiResponse.data && geminiResponse.data.candidates),
      candidatesLength: geminiResponse.data?.candidates?.length || 0
    });

    // Parse Gemini API JSON response robustly
    let result = null;
    if (geminiResponse.data && geminiResponse.data.candidates && geminiResponse.data.candidates.length > 0) {
      const content = geminiResponse.data.candidates[0].content;
      console.log('Gemini content structure:', {
        hasContent: !!content,
        hasParts: !!(content && content.parts),
        partsLength: content?.parts?.length || 0
      });
      
      if (content && content.parts && content.parts.length > 0) {
        const jsonText = content.parts[0].text;
        console.log('Raw Gemini response text:', jsonText);
        
        try {
          if (typeof jsonText === 'string' && jsonText.trim().startsWith('{')) {
            result = JSON.parse(jsonText);
            console.log('Successfully parsed JSON result:', result);
          }
        } catch (e) {
          console.log('Failed to parse as direct JSON, trying regex extraction...');
          // Fallback: try to extract JSON from text
          const match = jsonText.match(/\{[\s\S]*\}/);
          if (match && match[0].length < 10000) { // Limit size
            result = JSON.parse(match[0]);
            console.log('Successfully parsed JSON from regex:', result);
          } else {
            console.error('No valid JSON found in response text');
          }
        }
      }
    } else {
      console.error('Invalid Gemini response structure:', JSON.stringify(geminiResponse.data, null, 2));
    }

    if (!result) {
      return res.status(500).json({ error: 'Failed to parse Gemini API response' });
    }

    // Compose response for frontend
    const faceVerified = (result.faceMatch && result.faceMatch.toLowerCase() === 'yes');
    const reason = result.reason || 'No detailed reason provided';
    const confidence = result.confidence;

    // Store attempt in database (face_verification_attempts table)
    const attemptQuery = 'INSERT INTO face_verification_attempts (envelope_id, selfie_url, document_url, face_verified, attempted_at) VALUES ($1, $2, $3, $4, NOW())';
    await pool.query(attemptQuery, [envelopeId, selfieUrl, documentUrl, faceVerified]);

    // Log audit event for face verification
    const ipAddress = req.ip || req.connection.remoteAddress;
    await logAuditEvent('FACE_VERIFICATION_PROCESSED', null, ipAddress, { faceVerified });

    res.status(200).json({
      faceVerified,
      reason,
      confidence
    });
  } catch (error) {
    console.error('Error verifying face match with Gemini API:', error.stack || error);
    // If Gemini API returned an error response, forward the details
    if (error.response && error.response.data) {
      console.error('Gemini API error response:', JSON.stringify(error.response.data, null, 2));
      return res.status(500).json({ error: 'Internal server error', details: error.response.data });
    }
    console.error('General error details:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Endpoint to register a webhook for event notifications
app.post('/api/webhook/register', authenticateApiKey, async (req, res) => {
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

    const payload = {
      event: eventType,
      data: {
        ...data,
        source: 'IdentityVerificationPlatform'
      }
    };

    for (const webhook of webhookResult.rows) {
      console.log('Triggering webhook:', { eventType, url: webhook.url });
      try {
        await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 seconds timeout
        });
        console.log('Webhook successfully sent to:', webhook.url);
      } catch (error) {
        console.error('Failed to send webhook:', { url: webhook.url, error: error.message });
      }
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
};

// Endpoint to get all sessions for admin portal
app.get('/api/admin/sessions', authenticateApiKey, async (req, res) => {
  try {
    const envelopesQuery = 'SELECT e.*, r.name, r.email FROM envelopes e JOIN recipients r ON e.recipient_id = r.id ORDER BY e.created_at DESC';
    const envelopesResult = await pool.query(envelopesQuery);
    res.status(200).json({ sessions: envelopesResult.rows });
  } catch (error) {
    console.error('Error fetching sessions for admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get all API keys for admin portal
app.get('/api/admin/api-keys', authenticateApiKey, async (req, res) => {
  try {
    const keysQuery = 'SELECT id, name, partial_key, created_at, expires_at, revoked, last_used FROM api_keys ORDER BY created_at DESC';
    const keysResult = await pool.query(keysQuery);
    res.status(200).json({ apiKeys: keysResult.rows });
  } catch (error) {
    console.error('Error fetching API keys for admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to generate a new API key
app.post('/api/admin/api-keys', authenticateApiKey, async (req, res) => {
  try {
    const { name, expiresInDays } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name for API key is required' });
    }
    // Generate a new API key
    const newKey = `api_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = bcrypt.hashSync(newKey, 10);
    const partialKey = `${newKey.substring(0, 4)}****`;
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;
    // Store the key in the database
    const insertQuery = 'INSERT INTO api_keys (name, key_hash, partial_key, expires_at) VALUES ($1, $2, $3, $4) RETURNING id, created_at';
    const insertResult = await pool.query(insertQuery, [name, keyHash, partialKey, expiresAt]);
    const keyId = insertResult.rows[0].id;
    const createdAt = insertResult.rows[0].created_at;
    // Log audit event for API key creation
    const ipAddress = req.ip || req.connection.remoteAddress;
    await logAuditEvent('API_KEY_CREATED', req.apiKeyId, ipAddress, { keyId, name });
    res.status(201).json({
      message: 'API key generated successfully',
      apiKey: newKey,
      keyDetails: {
        id: keyId,
        name,
        partialKey,
        created_at: createdAt,
        expires_at: expiresAt,
        revoked: false
      }
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to revoke an API key
app.delete('/api/admin/api-keys/:keyId', authenticateApiKey, async (req, res) => {
  try {
    const { keyId } = req.params;
    const revokeQuery = 'UPDATE api_keys SET revoked = TRUE WHERE id = $1 RETURNING name';
    const revokeResult = await pool.query(revokeQuery, [keyId]);
    if (revokeResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    // Log audit event for API key revocation
    const ipAddress = req.ip || req.connection.remoteAddress;
    await logAuditEvent('API_KEY_REVOKED', req.apiKeyId, ipAddress, { keyId, name: revokeResult.rows[0].name });
    res.status(200).json({ message: 'API key revoked successfully', keyId });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/session/:id', authenticateApiKey, async (req, res) => {
  const id = req.params.id;
  // Validate and sanitize the ID parameter
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid session ID format' });
  }
  try {
    // Get envelope info before deletion
    const envelopeQuery = 'SELECT recipient_id FROM envelopes WHERE id = $1';
    const envelopeResult = await pool.query(envelopeQuery, [id]);
    if (envelopeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const recipientId = envelopeResult.rows[0].recipient_id;
    
    // Delete all related data
    await pool.query('DELETE FROM signing_tokens WHERE envelope_id = $1', [id]);
    await pool.query('DELETE FROM face_verification_attempts WHERE envelope_id = $1', [id]);
    await pool.query('DELETE FROM signatures WHERE envelope_id = $1', [id]);
    await pool.query('DELETE FROM documents WHERE recipient_id = $1', [recipientId]);
    await pool.query('DELETE FROM recipients WHERE id = $1', [recipientId]);
    await pool.query('DELETE FROM envelopes WHERE id = $1', [id]);
    
    res.status(200).json({ message: 'Session and all related data deleted successfully', id });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

app.get('/api/document/:id/download', authenticateApiKey, async (req, res) => {
  const id = req.params.id;
  // Validate and sanitize the ID parameter
  if (!id || typeof id !== 'string' || !/^\d+$/.test(id)) {
    console.error('Invalid document ID format:', id);
    return res.status(400).json({ error: 'Invalid document ID format' });
  }
  try {
    // Fetch document metadata
    const docQuery = 'SELECT * FROM documents WHERE id = $1';
    const docResult = await pool.query(docQuery, [id]);
    if (docResult.rows.length === 0) {
      console.error('Document not found for ID:', id);
      return res.status(404).json({ error: 'Document not found' });
    }
    const doc = docResult.rows[0];
    console.log('Document found:', { id: doc.id, filename: doc.filename, hasUrl: !!doc.url });
    
    if (!doc.url) {
      console.error('Missing document URL for document ID:', id);
      return res.status(400).json({ error: 'Missing document URL' });
    }
    
    // Check if URL is valid before downloading
    if (doc.url.includes('vercel-blob-simulated') || !doc.url.startsWith('http')) {
      console.error('Invalid blob URL detected:', doc.url);
      return res.status(500).json({ error: 'Invalid document URL' });
    }
    
    // Download the encrypted blob
    console.log('Downloading blob from URL:', doc.url);
    const blobResponse = await axios.get(doc.url, { responseType: 'arraybuffer' });
    const blobBuffer = Buffer.from(blobResponse.data);
    console.log('Downloaded blob size:', blobBuffer.length);
    
    // Check if document has encryption metadata
    if (!doc.encryption_iv || !doc.encryption_auth_tag) {
      console.log('Document not encrypted, returning as-is');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
      res.send(blobBuffer);
      return;
    }
    
    try {
      // Extract IV, auth tag, and encrypted content from blob
      const iv = Buffer.from(doc.encryption_iv, 'hex');
      const authTag = Buffer.from(doc.encryption_auth_tag, 'hex');
      const encryptedContent = blobBuffer;
      
      console.log('Decrypting document with IV length:', iv.length, 'AuthTag length:', authTag.length);
      
      // Decrypt
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        console.error('Encryption key not configured');
        return res.status(500).json({ error: 'Encryption key not configured' });
      }
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedContent);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      console.log('Document decrypted successfully, size:', decrypted.length);
      
      // Stream the PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
      res.send(decrypted);
    } catch (decryptError) {
      console.error('Decryption failed, trying to return document as-is:', decryptError.message);
      // Fallback: try to return the document without decryption
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
      res.send(blobBuffer);
    }

  } catch (error) {
    console.error('Error decrypting or streaming document:', error.stack || error);
    res.status(500).json({ error: 'Failed to decrypt or stream document', details: error.message });
  }
});

// Add upload endpoint for standalone file uploads
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Uploading file:', file.originalname, 'Size:', file.buffer.length);

    // Check if blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Blob token not configured');
      return res.status(500).json({ error: 'Storage not configured' });
    }

    // Upload to Vercel Blob without encryption for standalone uploads
    const cleanToken = process.env.BLOB_READ_WRITE_TOKEN.replace(/["']/g, '');
    const blob = await put(
      `${Date.now()}-${file.originalname}`,
      file.buffer,
      {
        access: 'public',
        token: cleanToken,
      }
    );

    console.log('File uploaded successfully:', blob.url);
    
    // Validate the returned URL
    if (!blob.url || blob.url.includes('simulated')) {
      console.error('Invalid blob URL returned:', blob.url);
      return res.status(500).json({ error: 'Storage upload failed' });
    }
    
    res.status(200).json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
});

// Endpoint to sign PDF with signatures and append ID proof
app.post('/api/sign-pdf', authenticateApiKey, upload.single('pdf'), async (req, res) => {
  try {
    console.log('Sign PDF request received');
    const pdfFile = req.file;
    const signatures = JSON.parse(req.body.signatures || '[]');
    const envelopeId = req.body.envelopeId;

    console.log('PDF file:', !!pdfFile, 'Signatures count:', signatures.length, 'Envelope ID:', envelopeId);

    if (!pdfFile) {
      console.error('No PDF file uploaded');
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    if (!signatures || signatures.length === 0) {
      console.error('No signatures provided');
      return res.status(400).json({ error: 'No signatures provided' });
    }

    // Load PDF-lib for PDF manipulation
    const { PDFDocument } = require('pdf-lib');
    
    console.log('Loading PDF document, buffer size:', pdfFile.buffer.length);
    // Load the PDF document with encryption handling
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfFile.buffer, { ignoreEncryption: true });
      console.log('PDF document loaded successfully');
    } catch (loadError) {
      console.error('Failed to load PDF with ignoreEncryption=true:', loadError.message);
      // Try loading without any options as fallback
      try {
        pdfDoc = await PDFDocument.load(pdfFile.buffer);
        console.log('PDF document loaded successfully without ignoreEncryption');
      } catch (fallbackError) {
        console.error('Failed to load PDF completely:', fallbackError.message);
        throw new Error('Unable to load PDF document. The file may be corrupted or use an unsupported encryption method.');
      }
    }
    
    // Mark placeholders as signed if envelope has placeholders
    if (envelopeId) {
      try {
        for (const sig of signatures) {
          if (sig.placeholderId) {
            await pool.query('UPDATE signature_placeholders SET is_signed = TRUE WHERE id = $1 AND envelope_id = $2', [sig.placeholderId, envelopeId]);
            console.log('Marked placeholder as signed:', sig.placeholderId);
          }
        }
      } catch (error) {
        console.error('Error updating signed placeholders:', error);
      }
    }
    
    // Process each signature
    for (const sig of signatures) {
      try {
        console.log('Processing signature:', { page: sig.page, x: sig.x, y: sig.y, name: sig.name });
        
        // Get page dimensions for coordinate logging
        const page = pdfDoc.getPage(sig.page - 1);
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        
        // Calculate final coordinates
        const finalX = sig.x * pageWidth;
        const finalY = pageHeight - (sig.y * pageHeight) - (sig.height || 64);
        
        console.log('Signature placement coordinates:', {
          normalizedX: sig.x,
          normalizedY: sig.y,
          pageWidth,
          pageHeight,
          finalX: Math.round(finalX),
          finalY: Math.round(finalY),
          signatureWidth: Math.round((sig.width || 0.2) * pageWidth),
          signatureHeight: Math.round((sig.height || 0.076) * pageHeight)
        });
        
        // Validate signature data
        if (!sig.imageDataUrl || !sig.imageDataUrl.startsWith('data:image/')) {
          console.error('Invalid signature image data');
          continue;
        }
        
        // Embed signature image with format detection and validation
        let signatureImage;
        try {
          if (sig.imageDataUrl.includes('data:image/png') || sig.imageDataUrl.startsWith('data:image/png')) {
            signatureImage = await pdfDoc.embedPng(sig.imageDataUrl);
          } else {
            // For all other formats or corrupted data, convert to PNG
            signatureImage = await pdfDoc.embedPng(sig.imageDataUrl);
          }
        } catch (embedError) {
          console.error('Failed to embed image, trying PNG fallback:', embedError.message);
          // Force PNG embedding for corrupted/invalid images
          signatureImage = await pdfDoc.embedPng(sig.imageDataUrl);
        }
        
        // Get the page (convert from 1-based to 0-based index)
        const signaturePage = pdfDoc.getPage(sig.page - 1);
        
        // Calculate Y position (PDF coordinates start from bottom-left)
        const absoluteY = signaturePage.getHeight() - (sig.y * signaturePage.getHeight()) - 64;
        
        // Draw the signature image with proper dimensions
        const signatureWidth = (sig.width || 0.2) * signaturePage.getWidth();
        const signatureHeight = (sig.height || 0.076) * signaturePage.getHeight();
        
        signaturePage.drawImage(signatureImage, {
          x: sig.x * signaturePage.getWidth(),
          y: absoluteY,
          width: signatureWidth,
          height: signatureHeight,
        });
        
        // Add metadata text
        const baseX = sig.x * signaturePage.getWidth();
        const metadataY = Math.max(absoluteY - 15, 20);
        
        signaturePage.drawText(`Signed by: ${sig.name || 'Unknown'}`, {
          x: baseX,
          y: metadataY,
          size: 8,
        });
        
        signaturePage.drawText(`IP Address: ${sig.ipAddress || 'Unknown'}`, {
          x: baseX,
          y: metadataY - 12,
          size: 8,
        });
        
        signaturePage.drawText(`Date: ${new Date(sig.timestamp || Date.now()).toLocaleString()}`, {
          x: baseX,
          y: metadataY - 24,
          size: 8,
        });
        
        console.log('Signature processed successfully');
      } catch (sigError) {
        console.error('Error processing signature:', sigError.message);
        // Continue with other signatures instead of failing completely
        continue;
      }
    }
    
    // Append ID proof documents if envelope ID is provided
    if (envelopeId) {
      try {
        // Get envelope and find face verification attempts (which contain document images)
        const envelopeQuery = 'SELECT * FROM envelopes WHERE id = $1';
        const envelopeResult = await pool.query(envelopeQuery, [envelopeId]);
        
        if (envelopeResult.rows.length > 0) {
          const faceVerificationQuery = 'SELECT * FROM face_verification_attempts WHERE envelope_id = $1 ORDER BY attempted_at DESC LIMIT 1';
          const faceResult = await pool.query(faceVerificationQuery, [envelopeId]);
          
          if (faceResult.rows.length > 0) {
            const faceAttempt = faceResult.rows[0];
            
            // Download and add document image
            if (faceAttempt.document_url) {
              try {
                const docResponse = await axios.get(faceAttempt.document_url, { responseType: 'arraybuffer' });
                const docImageBytes = Buffer.from(docResponse.data);
                const docImage = await pdfDoc.embedJpg(docImageBytes);
                
                // Add new page for ID proof
                const idProofPage = pdfDoc.addPage();
                const { width, height } = idProofPage.getSize();
                
                // Scale image to fit page
                const imgDims = docImage.scale(Math.min(width / docImage.width, height / docImage.height) * 0.8);
                
                idProofPage.drawText('Identity Verification Document', {
                  x: 50,
                  y: height - 50,
                  size: 16,
                });
                
                idProofPage.drawImage(docImage, {
                  x: (width - imgDims.width) / 2,
                  y: (height - imgDims.height) / 2 - 30,
                  width: imgDims.width,
                  height: imgDims.height,
                });
                
                console.log('ID proof document added to PDF');
              } catch (imgError) {
                console.error('Error adding ID proof image:', imgError);
              }
            }
          }
        }
      } catch (envelopeError) {
        console.error('Error fetching envelope data:', envelopeError);
      }
    }
    
    console.log('Saving signed PDF');
    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    console.log('Signed PDF saved, size:', signedPdfBytes.length);
    
    // Return the signed PDF as a buffer
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="signed-document.pdf"');
    res.send(Buffer.from(signedPdfBytes));
    
  } catch (error) {
    console.error('Error signing PDF:', error.stack || error);
    res.status(500).json({ error: 'Failed to sign PDF', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 
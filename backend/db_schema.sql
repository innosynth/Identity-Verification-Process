-- Create recipients table to store recipient information
CREATE TABLE IF NOT EXISTS recipients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table to store document metadata
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  recipient_id INTEGER REFERENCES recipients(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create envelopes table to store envelope information
CREATE TABLE IF NOT EXISTS envelopes (
  id VARCHAR(255) PRIMARY KEY,
  recipient_id INTEGER REFERENCES recipients(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create signatures table to store signature data
CREATE TABLE IF NOT EXISTS signatures (
  id SERIAL PRIMARY KEY,
  envelope_id VARCHAR(255) REFERENCES envelopes(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  data TEXT NOT NULL,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
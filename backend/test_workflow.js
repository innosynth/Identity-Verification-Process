const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Base URL for API
const BASE_URL = 'http://localhost:3000/api';

// Test data
const TEST_RECIPIENT_NAME = 'Test User';
const TEST_RECIPIENT_EMAIL = 'test@example.com';
const TEST_DOCUMENT_PATH = path.join(__dirname, 'test_document.pdf');
const TEST_SELFIE_PATH = path.join(__dirname, 'test_selfie.jpg');
const TEST_DOCUMENT_IMAGE_PATH = path.join(__dirname, 'test_document_image.jpg');

// Function to check if a file exists
const fileExists = (filePath) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

// Function to simulate document upload
async function testDocumentUpload() {
  console.log('Testing document upload...');
  const formData = new FormData();
  formData.append('recipientName', TEST_RECIPIENT_NAME);
  formData.append('recipientEmail', TEST_RECIPIENT_EMAIL);
  if (fileExists(TEST_DOCUMENT_PATH)) {
    formData.append('documents', fs.createReadStream(TEST_DOCUMENT_PATH));
  } else {
    console.warn(`Test document file not found at ${TEST_DOCUMENT_PATH}. Using dummy data.`);
    formData.append('documents', Buffer.from('Dummy document content'), { filename: 'dummy_document.pdf' });
  }

  try {
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: formData.getHeaders(),
    });
    console.log('Document upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in document upload:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to simulate document name verification
async function testDocumentNameVerification() {
  console.log('Testing document name verification...');
  const formData = new FormData();
  formData.append('recipientName', TEST_RECIPIENT_NAME);
  if (fileExists(TEST_DOCUMENT_IMAGE_PATH)) {
    formData.append('documentImage', fs.createReadStream(TEST_DOCUMENT_IMAGE_PATH));
  } else {
    console.warn(`Test document image not found at ${TEST_DOCUMENT_IMAGE_PATH}. Using dummy data.`);
    formData.append('documentImage', Buffer.from('Dummy image content'), { filename: 'dummy_document_image.jpg' });
  }

  try {
    const response = await axios.post(`${BASE_URL}/verify/document-name`, formData, {
      headers: formData.getHeaders(),
    });
    console.log('Document name verification result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in document name verification:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to simulate face verification
async function testFaceVerification() {
  console.log('Testing face verification...');
  const formData = new FormData();
  if (fileExists(TEST_SELFIE_PATH)) {
    formData.append('selfieImage', fs.createReadStream(TEST_SELFIE_PATH));
  } else {
    console.warn(`Test selfie image not found at ${TEST_SELFIE_PATH}. Using dummy data.`);
    formData.append('selfieImage', Buffer.from('Dummy selfie content'), { filename: 'dummy_selfie.jpg' });
  }
  if (fileExists(TEST_DOCUMENT_IMAGE_PATH)) {
    formData.append('documentImage', fs.createReadStream(TEST_DOCUMENT_IMAGE_PATH));
  } else {
    console.warn(`Test document image not found at ${TEST_DOCUMENT_IMAGE_PATH}. Using dummy data.`);
    formData.append('documentImage', Buffer.from('Dummy document image content'), { filename: 'dummy_document_image.jpg' });
  }

  try {
    const response = await axios.post(`${BASE_URL}/verify/face`, formData, {
      headers: formData.getHeaders(),
    });
    console.log('Face verification result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in face verification:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to test envelope verification update
async function testEnvelopeVerification(envelopeId, nameVerified, faceVerified) {
  console.log('Testing envelope verification update...');
  try {
    const response = await axios.post(`${BASE_URL}/envelope/${envelopeId}/verify`, {
      nameVerified,
      faceVerified
    });
    console.log('Envelope verification update result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in envelope verification update:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to test envelope preparation
async function testEnvelopePreparation(envelopeId) {
  console.log('Testing envelope preparation...');
  try {
    const response = await axios.post(`${BASE_URL}/envelope/${envelopeId}/prepare`);
    console.log('Envelope preparation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in envelope preparation:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to test signing link generation
async function testSigningLinkGeneration(envelopeId) {
  console.log('Testing signing link generation...');
  try {
    const response = await axios.get(`${BASE_URL}/envelope/${envelopeId}/signing-link`);
    console.log('Signing link generation result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in signing link generation:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to test envelope status update (e.g., after signing)
async function testEnvelopeStatusUpdate(envelopeId, status, signatureType, signatureData) {
  console.log('Testing envelope status update...');
  try {
    const response = await axios.post(`${BASE_URL}/envelope/${envelopeId}/status`, {
      status,
      signatureType,
      signatureData
    });
    console.log('Envelope status update result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in envelope status update:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to test webhook registration
async function testWebhookRegistration(url, events) {
  console.log('Testing webhook registration...');
  try {
    const response = await axios.post(`${BASE_URL}/webhook/register`, {
      url,
      events
    });
    console.log('Webhook registration result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in webhook registration:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Main test function to run the entire workflow
async function runWorkflowTest() {
  try {
    // Step 1: Upload documents and create envelope
    const uploadResult = await testDocumentUpload();
    const envelopeId = uploadResult.envelopeId;

    // Step 2: Verify document name
    const nameVerificationResult = await testDocumentNameVerification();

    // Step 3: Verify face
    const faceVerificationResult = await testFaceVerification();

    // Step 4: Update envelope verification status
    await testEnvelopeVerification(envelopeId, nameVerificationResult.nameVerified, faceVerificationResult.faceVerified);

    // Step 5: Prepare envelope for signing
    await testEnvelopePreparation(envelopeId);

    // Step 6: Generate signing link
    const signingLinkResult = await testSigningLinkGeneration(envelopeId);

    // Step 7: Simulate signing completion
    await testEnvelopeStatusUpdate(envelopeId, 'signed', 'drawn', 'signature_data_placeholder');

    // Step 8: Register a webhook for future events
    await testWebhookRegistration('https://example.com/webhook', ['verification_update', 'status_update']);

    console.log('Workflow test completed successfully!');
  } catch (error) {
    console.error('Workflow test failed:', error);
  }
}

// Run the test
runWorkflowTest();
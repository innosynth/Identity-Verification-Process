# Signing Process Guide

This guide outlines the steps to create a signing session, update its status, and generate a shareable URL for document signing using the Identity Verification Process application.

## Prerequisites

- **Backend Server**: Ensure the backend server is running on `localhost:3000`. Start it with `node backend/index.js` if necessary.
- **Frontend Server**: Ensure the frontend application is running on `localhost:8080` or the port/domain specified in the backend configuration (`FRONTEND_URL` environment variable).
- **API Key**: You need a valid API key for authentication. The key used in this guide is `api_a44ed8187b7eefb29518361d3e2eda69`.
- **Document**: Have a PDF file ready for upload (e.g., `sample-3.pdf`).

## Step-by-Step Process

### 1. Create a Signing Session

Initiate a new signing session by uploading a document and providing recipient details.

**Command**:
```bash
curl -X POST http://localhost:3000/api/signing-session -H 'x-api-key: api_a44ed8187b7eefb29518361d3e2eda69' -F 'recipientName=Jeevanantham' -F 'recipientEmail=jeevanantham.v26@gmail.com.com' -F 'documents=@sample-3.pdf'
```

**Expected Response**:
```json
{"message":"Signing session created successfully","sessionId":"ENV-<timestamp>","recipientId":<id>,"documentUrls":["https://vercel-blob-simulated/<timestamp>-sample-3.pdf"],"expiresAt":"YYYY-MM-DDTHH:MM:SS.SSSZ"}
```

**Note**: Replace `sample-3.pdf` with the path to your actual PDF file. Note down the `sessionId` from the response for subsequent steps.

### 2. Check Session Status (Optional)

Retrieve the current status and details of the signing session.

**Command** (replace `<sessionId>` with the actual ID):
```bash
curl -H 'x-api-key: api_a44ed8187b7eefb29518361d3e2eda69' http://localhost:3000/api/signing-session/<sessionId>
```

**Expected Response**: A JSON object with session details, including `status` (initially `"pending"`), recipient info, and documents.

### 3. Update Verification Status to 'Verified'

Update the envelope status to 'verified', simulating successful identity verification.

**Command** (replace `<sessionId>` with the actual ID):
```bash
curl -X POST http://localhost:3000/api/envelope/<sessionId>/verify -H 'x-api-key: api_a44ed8187b7eefb29518361d3e2eda69' -H 'Content-Type: application/json' -d '{"nameVerified": true, "faceVerified": true}'
```

**Expected Response**:
```json
{"message":"Verification status updated","status":"verified"}
```

### 4. Prepare Documents for Signing (Optional)

Prepare the documents by simulating the addition of signature fields, updating the status to 'prepared'.

**Command** (replace `<sessionId>` with the actual ID):
```bash
curl -X POST http://localhost:3000/api/envelope/<sessionId>/prepare -H 'x-api-key: api_a44ed8187b7eefb29518361d3e2eda69'
```

**Expected Response**:
```json
{"message":"Documents prepared for signing","envelopeId":"<sessionId>","preparedDocuments":[{"id":<id>,"filename":"sample-3.pdf"}]}
```

**Note**: This step is optional as the signing link can be generated with a 'verified' status.

### 5. Generate Signing Link (Shareable URL)

Generate the shareable URL for the recipient to sign the document.

**Command** (replace `<sessionId>` with the actual ID):
```bash
curl -H 'x-api-key: api_a44ed8187b7eefb29518361d3e2eda69' http://localhost:3000/api/envelope/<sessionId>/signing-link
```

**Expected Response**:
```json
{"signingLink":"http://localhost:8080/sign-pdf/<sessionId>?token=<random-token>","expiresAt":"YYYY-MM-DDTHH:MM:SS.SSSZ"}
```

This `signingLink` is the URL you can share with the recipient for signing the document.

## Example with Session ID ENV-1754227991967

For the specific session `ENV-1754227991967`, the command to generate the signing link is:

```bash
curl -H 'x-api-key: api_a44ed8187b7eefb29518361d3e2eda69' http://localhost:3000/api/envelope/ENV-1754227991967/signing-link
```

**Latest Response**:
```json
{"signingLink":"http://localhost:8080/sign-pdf/ENV-1754227991967?token=511cf9c52d7fa834865a044f47928bd4","expiresAt":"2025-08-04T13:44:52.066Z"}
```

## Troubleshooting 404 Errors

If you encounter a 404 error when accessing the signing link:

- **Ensure Frontend is Running**: Verify that the frontend application is running on the port specified in the URL (e.g., `8080`). Start it with `vite --port=8080` if using Vite.
- **Check Port/Domain**: If the frontend is on a different port or domain, update the `FRONTEND_URL` environment variable in the backend or manually adjust the URL.
- **Route Configuration**: Ensure the frontend route `/sign-pdf/:id` is defined and the component handles URL parameters (updates have been made to `App.tsx` and `SignPdf.tsx` to support this).

## Next Steps

- **Share the URL**: Send the `signingLink` to the recipient (e.g., John Doe at john.doe@example.com) via email or another method.
- **Monitor Status**: Check the session status with:
  ```bash
  curl -H 'x-api-key: api_a44ed8187b7eefb29518361d3e2eda69' http://localhost:3000/api/signing-session/ENV-1754227991967
  ```

If you have further questions or issues, refer to the project documentation or contact support. 
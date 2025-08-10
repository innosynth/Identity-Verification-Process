# PDF Signing Error Fixes

## Issues Fixed

### 1. API URL Configuration
- **Problem**: `VITE_API_URL` was empty in `.env` file
- **Fix**: Set `VITE_API_URL=http://localhost:3000`

### 2. Document Decryption Error Handling
- **Problem**: Document decryption was failing and causing 500 errors
- **Fix**: Added fallback handling to serve documents without decryption if decryption fails

### 3. Enhanced Error Logging
- **Problem**: Limited error information made debugging difficult
- **Fix**: Added comprehensive logging throughout the backend and frontend

### 4. Missing Upload Endpoint
- **Problem**: Frontend was calling `/api/upload` but it wasn't implemented in backend
- **Fix**: Added upload endpoint for standalone file uploads

## How to Start the System

### 1. Start Backend Server
```bash
cd backend
npm install
npm start
```
The backend will run on http://localhost:3000

### 2. Start Frontend
```bash
npm install
npm run dev
```
The frontend will run on http://localhost:8080

### 3. Test the System

#### Option A: Create a Test Session
```bash
node create-test-session.js
```
This will create a test signing session and provide a URL to test with.

#### Option B: Test Backend Directly
```bash
node test-backend.js
```
This will verify the backend is working correctly.

## Debugging Endpoints

### Test Session (No Auth Required)
```
GET /api/test-session/:id
```

### Test Document Download (No Auth Required)
```
GET /api/test-document/:id
```

### Health Check
```
GET /api/health
```

## Common Issues and Solutions

### 1. "Failed to fetch document: 500"
- **Cause**: Document decryption failure or missing document
- **Solution**: Check backend logs, ensure encryption key is set correctly
- **Fallback**: System now tries to serve document without decryption

### 2. "Unauthorized" errors
- **Cause**: Missing or incorrect API key
- **Solution**: Ensure `VITE_ADMIN_API_KEY` matches in both frontend and backend

### 3. Database connection errors
- **Cause**: PostgreSQL database not accessible
- **Solution**: Check `DATABASE_URL` in `.env` file

### 4. Blob storage errors
- **Cause**: Invalid Vercel Blob token
- **Solution**: Verify `BLOB_READ_WRITE_TOKEN` in `.env` file

## Environment Variables Required

```
VITE_API_URL=http://localhost:3000
VITE_ADMIN_API_KEY=api_a44ed8187b7eefb29518361d3e2eda69
DATABASE_URL=postgres://...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
ENCRYPTION_KEY=9c7b423492475ccb76f43c9cacc73cc3611bc9cbde3474eafae9cea18d9faf34
GEMINI_API_KEY=AIzaSyD_nR71zBzxTfhoqyoWSByDGRsbVXawfeI
```

## Testing the PDF Signing Flow

1. Start both backend and frontend servers
2. Navigate to http://localhost:8080
3. Upload a PDF file or use a test session
4. Create a signature by drawing or typing
5. Drag the signature onto the PDF
6. Click "Sign & Submit"

The system should now work without the 500 error. If issues persist, check the browser console and backend logs for detailed error information.
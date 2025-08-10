#!/bin/bash

echo "Starting Identity Verification Backend..."

# Navigate to backend directory
cd backend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Start the backend server
echo "Starting backend server on port 3000..."
npm start
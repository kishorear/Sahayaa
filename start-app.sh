#!/bin/bash
# Script to start the application with the correct Node.js path

# Export the Node.js path
export PATH="/mnt/nixmodules/nix/store/5qsvgakh44n1akfjjfjizwaynr7vd2sy-nodejs-18.20.5-wrapped/bin:$PATH"

# Verify Node.js and npm are available
echo "Node.js version:"
node -v
echo "NPM version:"
npm -v

# Run the application
echo "Starting application..."
npm run dev
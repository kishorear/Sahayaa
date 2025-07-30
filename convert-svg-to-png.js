import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple function to copy SVG to client/public directory so it can be served as static asset
const sourcePath = path.join(__dirname, 'architecture-diagram.svg');
const destPath = path.join(__dirname, 'client', 'public', 'architecture-diagram.svg');

try {
  // Ensure the public directory exists
  const publicDir = path.dirname(destPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Copy the SVG file
  fs.copyFileSync(sourcePath, destPath);
  console.log('Architecture diagram copied to client/public/architecture-diagram.svg');
  
  // Also create a PNG version note - we'll serve the SVG directly since it's scalable
  console.log('SVG file is ready to be served as a static asset');
  console.log('Access it at: /architecture-diagram.svg');
  
} catch (error) {
  console.error('Error copying file:', error);
}
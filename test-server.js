// Simple test server to check if Node.js is working
console.log("Starting test server...");

import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World! Server is working.\n');
});

const port = 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at http://localhost:${port}/`);
});
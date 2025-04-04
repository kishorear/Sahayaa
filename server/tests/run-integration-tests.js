/**
 * Run Integration Tests
 * 
 * This script sets up the Jest testing environment and runs the integration tests.
 */

const { execSync } = require('child_process');

console.log('Setting up Jest environment...');

// Run the tests
try {
  console.log('Running integration tests...');
  
  // Use npx jest to run the tests with proper TypeScript support
  execSync('npx jest --config=server/tests/jest.config.js server/tests/integration-tests.ts', {
    stdio: 'inherit'
  });
  
  console.log('Integration tests completed successfully!');
} catch (error) {
  console.error('Integration tests failed:', error.message);
  process.exit(1);
}
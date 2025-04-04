/**
 * Jest Setup for Integration Tests
 * 
 * This file contains setup code that runs before each test file.
 */

// Suppress console output during tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error and warn for test debugging
  error: console.error,
  warn: console.warn,
};

// Set environment variables for testing
process.env.NODE_ENV = 'test';
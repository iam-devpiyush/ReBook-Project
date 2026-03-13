/**
 * Jest Test Setup
 * 
 * This file runs before all tests to configure the test environment.
 */

// Extend Jest timeout for property-based tests
jest.setTimeout(30000);

// Load environment variables for testing
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

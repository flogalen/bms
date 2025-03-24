// This file will be used to set up the Jest testing environment
import { mockPrisma } from './src/__tests__/mocks/prisma.mock';

// Set up global Jest configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

// Set up global mocks
(global as any).prisma = mockPrisma;

// Set NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

// Reset all mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});

// Close any open handles after all tests are done
afterAll(async () => {
  // Add a small delay to ensure all async operations have completed
  await new Promise(resolve => setTimeout(resolve, 500));
});

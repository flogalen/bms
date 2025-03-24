// This file will be used to set up the Jest testing environment
import { mockPrisma } from './src/__tests__/mocks/prisma.mock';

// Set up global Jest configuration
jest.setTimeout(30000); // 30 seconds timeout for tests (matching jest.config.js)

// Set up global mocks
(global as any).prisma = mockPrisma;

// Set NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

// Cache the original console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Mock console methods before each test to reduce noise
beforeEach(() => {
  // BEST PRACTICE: Avoid global mock resets that can wipe out critical mocks
  // Instead of using jest.resetAllMocks() or jest.clearAllMocks() globally,
  // each test file should be responsible for managing its own mocks
  
  // Only mock console methods globally to reduce noise
  console.error = jest.fn();
  // Uncomment the line below to suppress console.log output during tests
  // console.log = jest.fn();
});

// Restore console methods after each test
afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  
  // Don't reset mocks here, as we want to preserve our custom implementations
  // jest.clearAllMocks() and jest.resetAllMocks() are disabled
});

// Close any open handles after all tests are done
afterAll(async () => {
  console.log("Global afterAll: Cleaning up after tests");
  
  // Add a small delay to ensure all async operations have completed
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Don't restore mocks globally, as it can interfere with custom implementations
  // jest.restoreAllMocks() is disabled
  
  // Force garbage collection if possible to clean up any lingering resources
  if (global.gc) {
    console.log("Running garbage collection");
    global.gc();
  }
});

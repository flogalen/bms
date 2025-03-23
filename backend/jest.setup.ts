// This file will be used to set up the Jest testing environment

// Set up global Jest configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

// Reset all mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});

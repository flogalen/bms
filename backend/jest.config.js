module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      isolatedModules: true
    }]
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testTimeout: 30000, // Increased timeout to allow tests to complete
  // Disable automatic mock resetting to preserve our custom implementations
  // We handle mock clearing in jest.setup.ts and individual test files
  clearMocks: false,
  restoreMocks: false,
  resetMocks: false,
  // Run tests in sequence
  maxWorkers: 1,
  testEnvironmentOptions: {
    NODE_ENV: "test"
  },
  // Detect open handles that prevent Jest from exiting
  detectOpenHandles: true,
  // Force exit after tests complete
  forceExit: true
};

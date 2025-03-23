// src/__tests__/mocks/prisma.mock.ts
import { PrismaClient } from '@prisma/client';

// Create a mock Prisma client
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// This file is not a test file, it's a helper module for tests
// We'll export the mock client for use in tests
export { mockPrismaClient };

// We'll also export a function to setup the mock
export function setupPrismaMock() {
  // Mock the PrismaClient constructor
  jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
  }));
  
  return mockPrismaClient;
}

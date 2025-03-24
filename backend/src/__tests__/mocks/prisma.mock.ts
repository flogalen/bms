import { PrismaClient } from '@prisma/client';

// Create a mock Prisma client
export const mockPrisma = {
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

// Setup function to be called in beforeEach
export function setupPrismaMock() {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Set the global prisma instance to our mock
  (global as any).prisma = mockPrisma;
  
  return mockPrisma;
}

// Add a simple test to avoid Jest warning about no tests
describe('Prisma Mock', () => {
  it('should export mockPrisma and setupPrismaMock', () => {
    expect(mockPrisma).toBeDefined();
    expect(setupPrismaMock).toBeDefined();
  });
});

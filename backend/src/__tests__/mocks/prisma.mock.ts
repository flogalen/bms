import { PrismaClient } from '@prisma/client';

// Mock PrismaClientKnownRequestError
class PrismaClientKnownRequestError extends Error {
  code: string;
  
  constructor(message: string, { code }: { code: string }) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code;
  }
}

// Add PrismaClientKnownRequestError to the Prisma namespace
(global as any).Prisma = {
  PrismaClientKnownRequestError
};

// Create a mock Prisma client
export const mockPrisma = {
  tag: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  interactionTag: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
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
  person: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  dynamicField: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  interactionLog: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// Setup function to be called in beforeEach
export function setupPrismaMock() {
  // Reset all mock implementations and history
  Object.keys(mockPrisma).forEach(modelName => {
    const model = mockPrisma[modelName as keyof typeof mockPrisma];
    if (model) {
      Object.keys(model).forEach(methodName => {
        const method = model[methodName as keyof typeof model];
        if (typeof method === 'function' && method.mockClear) {
          method.mockClear();
          // Reset mock implementations to default resolved values
          if (methodName === 'findUnique' || methodName === 'findFirst') {
            method.mockResolvedValue(null);
          } else if (methodName === 'findMany') {
            method.mockResolvedValue([]);
          } else if (methodName === 'count') {
            method.mockResolvedValue(0);
          } else {
            method.mockResolvedValue(undefined);
          }
        }
      });
    }
  });
  
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

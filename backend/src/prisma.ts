import { PrismaClient } from '@prisma/client';

// Log environment information
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Is test environment:", process.env.NODE_ENV === 'test');
console.log("Global prisma exists:", (global as any).prisma !== undefined);

// Create a singleton Prisma client
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'test') {
  console.log("Using mocked prisma client");
  prisma = (global as any).prisma;
} else {
  console.log("Using real prisma client");
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
}

export default prisma;

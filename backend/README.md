# Backend

This is the backend for the Business Management System, built with Node.js, Express, TypeScript, and Prisma.

## Getting Started

```bash
# Install dependencies
npm install

# Create a .env file (copy from .env.example)
cp .env.example .env

# Setup the database
npm run prisma:migrate

# Run the development server
npm run dev
```

## Available Scripts

- `npm run dev`: Starts the development server with hot-reloading
- `npm run build`: Builds the app for production
- `npm run start`: Starts the production server
- `npm run test`: Runs tests
- `npm run prisma:generate`: Generates Prisma client
- `npm run prisma:migrate`: Runs database migrations
- `npm run prisma:studio`: Opens Prisma Studio to manage data


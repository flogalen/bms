import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import authRoutes from '../../routes/auth.routes';
import * as authMiddleware from '../../middlewares/auth.middleware';
import { mockPrisma, setupPrismaMock } from '../mocks/prisma.mock';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');
jest.mock('../../middlewares/auth.middleware');
jest.mock('../../utils/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../utils/token', () => ({
  generateToken: jest.fn().mockReturnValue('generated-token'),
  calculateExpiryTime: jest.fn().mockReturnValue(new Date(Date.now() + 3600000)),
  isTokenExpired: jest.fn().mockReturnValue(false),
  checkResetRateLimit: jest.fn().mockReturnValue(false)
}));

// Import the mocked functions for direct access
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../../utils/email';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Prisma mock
    setupPrismaMock();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Mock authenticateJWT middleware
    (authMiddleware.authenticateJWT as jest.Mock).mockImplementation(
      (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.user = { id: 'user-id', email: 'test@example.com', role: 'USER' };
        next();
      }
    );
  });

  describe('POST /register', () => {
    it('should register a new user', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Mock password hashing
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Mock user creation
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        role: 'USER'
      });

      // Mock JWT token
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      // Make request
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'password123',
          name: 'New User'
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
    });

    it('should return 400 if user already exists', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'existing@example.com'
      });

      // Make request
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User'
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  describe('POST /login', () => {
    it('should login a user successfully', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
        twoFactorEnabled: false
      });

      // Mock password validation
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock JWT token
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

      // Make request
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'jwt-token');
      expect(response.body).toHaveProperty('id', 'user-id');
      expect(response.body).toHaveProperty('email', 'user@example.com');
      expect(response.body).toHaveProperty('name', 'Test User');
    });

    it('should return 404 if user not found', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Make request
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should return 401 if password is invalid', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
        twoFactorEnabled: false
      });

      // Mock password validation fails
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Make request
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrong-password'
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('POST /forgot-password', () => {
    it('should process forgot password request', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User'
      });

      // Mock token creation
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: 'token-id',
        token: 'generated-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 3600000),
        used: false
      });

      // Ensure email sending returns true
      (sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(true);

      // Make request
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'user@example.com'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'If your email is registered, you will receive a password reset link'
      );
    });

    it('should return same message for non-existent user', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Make request
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'If your email is registered, you will receive a password reset link'
      );
    });
  });

  describe('POST /reset-password', () => {
    it('should reset password with valid token', async () => {
      // Mock token exists and is valid
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour in the future
        used: false,
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User'
        }
      });

      // Make request
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          password: 'new-password'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'Password has been reset successfully'
      );
    });

    it('should return 400 if token is invalid', async () => {
      // Mock token doesn't exist
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      // Make request
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'new-password'
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });

  describe('GET /me', () => {
    it('should return current user data', async () => {
      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Make request
      const response = await request(app).get('/api/auth/me');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'user-id');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('name', 'Test User');
      expect(response.body).toHaveProperty('role', 'USER');
    });
  });

  describe('POST /logout', () => {
    it('should handle logout successfully', async () => {
      // Make request
      const response = await request(app).post('/api/auth/logout');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });
});

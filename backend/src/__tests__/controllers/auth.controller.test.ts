import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import * as authController from '../../controllers/auth/auth.controller';
import * as emailUtils from '../../utils/email';
import * as tokenUtils from '../../utils/token';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('@prisma/client');
jest.mock('../../utils/email');
jest.mock('../../utils/token');

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request and response
    mockRequest = {
      body: {},
      user: { id: 'user-id', email: 'test@example.com', role: 'USER' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock Prisma
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    };

    // @ts-ignore - Mock the PrismaClient constructor
    PrismaClient.mockImplementation(() => mockPrisma);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      mockRequest.body = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      };

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

      // Act
      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' }
      });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          password: 'hashed-password',
          name: 'New User'
        }
      });
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        token: 'jwt-token'
      });
    });

    it('should return 400 if user already exists', async () => {
      // Arrange
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User'
      };

      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'existing@example.com'
      });

      // Act
      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User already exists'
      });
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle errors during registration', async () => {
      // Arrange
      mockRequest.body = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      };

      // Mock error during user creation
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Something went wrong'
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123'
      };

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

      // Act
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        token: 'jwt-token'
      });
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return 401 if password is invalid', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@example.com',
        password: 'wrong-password'
      };

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

      // Act
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should handle 2FA if enabled', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123'
      };

      // Mock user exists with 2FA enabled
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
        twoFactorEnabled: true
      });

      // Mock password validation
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        requireTwoFactor: true,
        userId: 'user-id'
      });
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should process forgot password request for existing user', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@example.com'
      };

      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User'
      });

      // Mock rate limit check
      (tokenUtils.checkResetRateLimit as jest.Mock).mockReturnValue(false);

      // Mock token generation
      (tokenUtils.generateToken as jest.Mock).mockReturnValue('reset-token');
      (tokenUtils.calculateExpiryTime as jest.Mock).mockReturnValue(new Date());

      // Mock token creation
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: 'token-id',
        token: 'reset-token',
        userId: 'user-id',
        expiresAt: new Date(),
        used: false
      });

      // Mock email sending
      (emailUtils.sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);

      // Act
      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' }
      });
      expect(tokenUtils.checkResetRateLimit).toHaveBeenCalledWith('user@example.com');
      expect(tokenUtils.generateToken).toHaveBeenCalled();
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
      expect(emailUtils.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        'reset-token',
        'Test User'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'If your email is registered, you will receive a password reset link'
      });
    });

    it('should return generic message for non-existent user', async () => {
      // Arrange
      mockRequest.body = {
        email: 'nonexistent@example.com'
      };

      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'If your email is registered, you will receive a password reset link'
      });
      expect(tokenUtils.generateToken).not.toHaveBeenCalled();
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailUtils.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      // Arrange
      mockRequest.body = {
        email: 'user@example.com'
      };

      // Mock user exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User'
      });

      // Mock rate limit exceeded
      (tokenUtils.checkResetRateLimit as jest.Mock).mockReturnValue(true);

      // Act
      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' }
      });
      expect(tokenUtils.checkResetRateLimit).toHaveBeenCalledWith('user@example.com');
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many reset attempts. Please try again later.'
      });
      expect(tokenUtils.generateToken).not.toHaveBeenCalled();
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Arrange
      mockRequest.body = {
        token: 'valid-token',
        password: 'new-password'
      };

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

      // Mock token expiry check
      (tokenUtils.isTokenExpired as jest.Mock).mockReturnValue(false);

      // Mock password hashing
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      // Mock user and token updates
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: 'new-hashed-password'
      });
      mockPrisma.passwordResetToken.update.mockResolvedValue({
        id: 'token-id',
        used: true
      });

      // Mock email sending
      (emailUtils.sendPasswordChangedEmail as jest.Mock).mockResolvedValue(true);

      // Act
      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        include: { user: true }
      });
      expect(tokenUtils.isTokenExpired).toHaveBeenCalled();
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 'salt');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { password: 'new-hashed-password' }
      });
      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { used: true }
      });
      expect(emailUtils.sendPasswordChangedEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Test User'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Password has been reset successfully'
      });
    });

    it('should return 400 if token is invalid', async () => {
      // Arrange
      mockRequest.body = {
        token: 'invalid-token',
        password: 'new-password'
      };

      // Mock token doesn't exist
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      // Act
      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'invalid-token' },
        include: { user: true }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 if token is already used', async () => {
      // Arrange
      mockRequest.body = {
        token: 'used-token',
        password: 'new-password'
      };

      // Mock token exists but is already used
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id',
        token: 'used-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 3600000),
        used: true,
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User'
        }
      });

      // Act
      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'used-token' },
        include: { user: true }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token has already been used'
      });
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 if token is expired', async () => {
      // Arrange
      mockRequest.body = {
        token: 'expired-token',
        password: 'new-password'
      };

      // Mock token exists but is expired
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id',
        token: 'expired-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
        used: false,
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User'
        }
      });

      // Mock token expiry check
      (tokenUtils.isTokenExpired as jest.Mock).mockReturnValue(true);

      // Act
      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'expired-token' },
        include: { user: true }
      });
      expect(tokenUtils.isTokenExpired).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token has expired'
      });
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should handle logout successfully', async () => {
      // Act
      await authController.logout(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully'
      });
    });
  });

  describe('getMe', () => {
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

      // Act
      await authController.getMe(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true
        }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange - user not authenticated
      mockRequest.user = undefined;

      // Act
      await authController.getMe(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not authenticated'
      });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      await authController.getMe(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: expect.any(Object)
      });
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
    });
  });
});

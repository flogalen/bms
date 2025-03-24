import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT, isAdmin } from '../../middlewares/auth.middleware';
import { mockPrisma, setupPrismaMock } from '../mocks/prisma.mock';

// Mock dependencies
jest.mock('jsonwebtoken');

// Initialize Prisma mock
setupPrismaMock();

describe('Auth Middleware', () => {
  // Set a higher timeout for all tests in this suite
  jest.setTimeout(30000);

  // Mock request and response objects
  let req: Partial<Request>;
  let res: Partial<Response>;
  let resJson: jest.Mock;
  let resStatus: jest.Mock;
  let next: NextFunction;

  beforeEach(() => {
    // Reset Prisma mock for each test
    setupPrismaMock();
    
    // Clear other mock history but preserve implementations
    jest.clearAllMocks();
    
    // Set up mock request and response objects
    resJson = jest.fn().mockReturnThis();
    resStatus = jest.fn().mockReturnValue({ json: resJson });
    
    req = {
      headers: {
        authorization: 'Bearer valid-token'
      }
    };
    
    res = {
      status: resStatus,
      json: resJson
    };
    
    next = jest.fn();
  });

  describe('authenticateJWT', () => {
    it('should authenticate valid JWT token', () => {
      // Arrange
      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 'user-id',
        email: 'test@example.com',
        role: 'USER'
      });

      // Act
      authenticateJWT(req as Request, res as Response, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(req.user).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        role: 'USER'
      });
      expect(next).toHaveBeenCalled();
      expect(resStatus).not.toHaveBeenCalled();
    });

    it('should return 401 if no token provided', () => {
      // Arrange
      // Mock request without token
      req.headers = {};

      // Act
      authenticateJWT(req as Request, res as Response, next);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(401);
      expect(resJson).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid', () => {
      // Arrange
      // Mock request with invalid token format
      req.headers = {
        authorization: 'InvalidToken'
      };

      // Act
      authenticateJWT(req as Request, res as Response, next);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(401);
      expect(resJson).toHaveBeenCalledWith({ error: 'Token error' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', () => {
      // Arrange
      // Mock JWT verification failure
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      authenticateJWT(req as Request, res as Response, next);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(401);
      expect(resJson).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isAdmin', () => {
    it('should allow admin users', () => {
      // Arrange
      // Mock admin user
      req.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      // Act
      isAdmin(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(resStatus).not.toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', () => {
      // Arrange
      // Mock regular user
      req.user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'USER'
      };

      // Act
      isAdmin(req as Request, res as Response, next);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(403);
      expect(resJson).toHaveBeenCalledWith({
        error: 'Access denied. Admin role required.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

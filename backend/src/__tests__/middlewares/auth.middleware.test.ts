import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT, isAdmin } from '../../middlewares/auth.middleware';

// Mock dependencies
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request and response
    mockRequest = {
      headers: {
        authorization: 'Bearer valid-token'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    nextFunction = jest.fn();
  });

  describe('authenticateJWT', () => {
    it('should authenticate valid JWT token', () => {
      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 'user-id',
        email: 'test@example.com',
        role: 'USER'
      });

      // Call the middleware
      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(mockRequest.user).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        role: 'USER'
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if no token provided', () => {
      // Mock request without token
      mockRequest.headers = {};

      // Call the middleware
      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid', () => {
      // Mock request with invalid token format
      mockRequest.headers = {
        authorization: 'InvalidToken'
      };

      // Call the middleware
      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token error' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', () => {
      // Mock JWT verification failure
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Call the middleware
      authenticateJWT(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('isAdmin', () => {
    it('should allow admin users', () => {
      // Mock admin user
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      // Call the middleware
      isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', () => {
      // Mock regular user
      mockRequest.user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'USER'
      };

      // Call the middleware
      isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access denied. Admin role required.'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});

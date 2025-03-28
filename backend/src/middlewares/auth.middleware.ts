import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// !!! SECURITY WARNING: Ensure JWT_SECRET environment variable is set to a strong, unique secret in production!
const JWT_SECRET = process.env.JWT_SECRET || "your-default-jwt-secret";

// TODO: Consider implementing a token blacklist (e.g., in Redis) to check against during verification
// for immediate invalidation of compromised/logged-out tokens.

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  // Check if auth header starts with Bearer
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({ error: "Token error" });
    return;
  }

  const token = parts[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Check if user has admin role
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Access denied. Admin role required." });
    return;
  }
  next();
};

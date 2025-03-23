import crypto from 'crypto';

/**
 * Generate a secure random token
 * @returns A random token string
 */
export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Calculate expiration time (1 hour from now)
 * @returns Date object set to 1 hour in the future
 */
export const calculateExpiryTime = (): Date => {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + 1); // Token valid for 1 hour
  return expiryTime;
};

/**
 * Check if a token has expired
 * @param expiryTime The expiration timestamp
 * @returns Boolean indicating if the token has expired
 */
export const isTokenExpired = (expiryTime: Date): boolean => {
  return new Date() > expiryTime;
};

/**
 * Implement rate limiting for password reset requests
 * This is a simple in-memory implementation
 * In production, you would use Redis or a similar solution
 */
const resetAttempts = new Map<string, { count: number; lastAttempt: Date }>();

/**
 * Check if a user has exceeded the rate limit for password reset requests
 * @param email User's email
 * @returns Boolean indicating if the rate limit has been exceeded
 */
export const checkResetRateLimit = (email: string): boolean => {
  const now = new Date();
  const userAttempts = resetAttempts.get(email);
  
  // If no previous attempts, allow the request
  if (!userAttempts) {
    resetAttempts.set(email, { count: 1, lastAttempt: now });
    return false;
  }
  
  // Reset count if last attempt was more than 24 hours ago
  const hoursSinceLastAttempt = (now.getTime() - userAttempts.lastAttempt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLastAttempt > 24) {
    resetAttempts.set(email, { count: 1, lastAttempt: now });
    return false;
  }
  
  // Allow up to 3 attempts per 24 hours
  if (userAttempts.count >= 3) {
    return true; // Rate limit exceeded
  }
  
  // Increment attempt count
  resetAttempts.set(email, { 
    count: userAttempts.count + 1, 
    lastAttempt: now 
  });
  
  return false;
};

/**
 * Clean up expired rate limit entries (call periodically)
 */
export const cleanupRateLimits = (): void => {
  const now = new Date();
  
  for (const [email, data] of resetAttempts.entries()) {
    const hoursSinceLastAttempt = (now.getTime() - data.lastAttempt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAttempt > 24) {
      resetAttempts.delete(email);
    }
  }
};

// Set up periodic cleanup (every hour) only in production
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupRateLimits, 60 * 60 * 1000);
}

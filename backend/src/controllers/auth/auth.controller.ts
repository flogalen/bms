import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "../../utils/email";
import { 
  generateToken, 
  calculateExpiryTime, 
  isTokenExpired,
  checkResetRateLimit
} from "../../utils/token";
import prisma from "../../prisma";

// !!! SECURITY WARNING: Ensure JWT_SECRET environment variable is set to a strong, unique secret in production!
const JWT_SECRET = process.env.JWT_SECRET || "your-default-jwt-secret"; 
const BCRYPT_SALT_ROUNDS = 12; // Increased salt rounds

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Create and send JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return user info (without password) and token
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Check if user exists and password is valid in a way that prevents user enumeration
    if (!user) {
      // Still perform a hash comparison to make timing attacks harder, even though user doesn't exist.
      // Use a dummy hash. Ensure the dummy hash format matches real hashes.
      const dummyHash = `$2b$${BCRYPT_SALT_ROUNDS}$invalidhashinvalidhashinvalidhashinvalidhashinvalidhas`;
      await bcrypt.compare(password, dummyHash); 
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // TODO: Implement proper 2FA verification flow (e.g., TOTP)
      // For 2FA flow, we would generate a temporary token and require verification
      res.status(200).json({
        requireTwoFactor: true,
        userId: user.id,
      });
      return;
    }

    // Create and send JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return user info and token
    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Request password reset
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // For security reasons, don't reveal if the email exists or not
    if (!user) {
      res.status(200).json({ 
        message: "If your email is registered, you will receive a password reset link" 
      });
      return;
    }

    // Check rate limiting
    if (checkResetRateLimit(email)) {
      res.status(429).json({ 
        error: "Too many reset attempts. Please try again later." 
      });
      return;
    }

    // Generate a secure token
    const token = generateToken();
    const expiresAt = calculateExpiryTime();

    // Store the token in the database
    await prisma.passwordResetToken.create({
      data: {
        token,
        expiresAt,
        userId: user.id,
      },
    });

    // Send the password reset email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      token,
      user.name || undefined
    );

    if (!emailSent) {
      res.status(500).json({ error: "Failed to send reset email" });
      return;
    }

    // Return success message
    res.status(200).json({ 
      message: "If your email is registered, you will receive a password reset link" 
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Reset password with token
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }

  try {
    // Find the token in the database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!resetToken) {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }

    if (resetToken.used) {
      res.status(400).json({ error: "Token has already been used" });
      return;
    }

    if (isTokenExpired(resetToken.expiresAt)) {
      res.status(400).json({ error: "Token has expired" });
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the user's password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Mark the token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Send confirmation email
    await sendPasswordChangedEmail(
      resetToken.user.email,
      resetToken.user.name || undefined
    );

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Logout user
export const logout = async (req: Request, res: Response): Promise<void> => {
  // For stateless JWT, logout is primarily handled client-side by discarding the token.
  // For enhanced security, implement a server-side token blacklist (e.g., using Redis or a database table)
  // to immediately invalidate the token upon logout.
  try {
    // Example: await blacklistToken(req.headers.authorization?.split(' ')[1]);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Get current user
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // The user ID should be attached by the auth middleware
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Update user settings
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { name, email } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Enable/disable 2FA (simplified for MVP)
export const toggleTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { enable } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // --- 2FA Placeholder ---
    // TODO: This is an MVP placeholder. A real implementation requires:
    // 1. Generating a unique secret per user (e.g., using speakeasy).
    // 2. Displaying QR code/secret to the user for authenticator app setup.
    // 3. Verifying the TOTP code provided by the user during login and 2FA setup/toggle.
    // 4. Implementing recovery codes.
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: enable,
        twoFactorSecret: enable ? "secret-placeholder" : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        twoFactorEnabled: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Toggle 2FA error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

import { Router, Request, Response, NextFunction } from "express";
import * as authController from "../controllers/auth/auth.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

// Helper function to wrap async controllers
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Public routes
router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password", asyncHandler(authController.resetPassword));
router.post("/logout", asyncHandler(authController.logout));

// Protected routes
router.get("/me", authenticateJWT, asyncHandler(authController.getMe));
router.put("/me", authenticateJWT, asyncHandler(authController.updateUser));
router.post("/two-factor", authenticateJWT, asyncHandler(authController.toggleTwoFactor));

export default router;

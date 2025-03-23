import { Router } from "express";
import * as authController from "../controllers/auth/auth.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/logout", authController.logout);

// Protected routes
router.get("/me", authenticateJWT, authController.getMe);
router.put("/me", authenticateJWT, authController.updateUser);
router.post("/two-factor", authenticateJWT, authController.toggleTwoFactor);

export default router;

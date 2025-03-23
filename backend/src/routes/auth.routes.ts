import { Router } from "express";
import * as authController from "../controllers/auth/auth.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/register", (req, res, next) => {
  authController.register(req, res).catch(next);
});

router.post("/login", (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.post("/forgot-password", (req, res, next) => {
  authController.forgotPassword(req, res).catch(next);
});

router.post("/reset-password", (req, res, next) => {
  authController.resetPassword(req, res).catch(next);
});

router.post("/logout", (req, res, next) => {
  authController.logout(req, res).catch(next);
});

// Protected routes
router.get("/me", authenticateJWT, (req, res, next) => {
  authController.getMe(req, res).catch(next);
});

router.put("/me", authenticateJWT, (req, res, next) => {
  authController.updateUser(req, res).catch(next);
});

router.post("/two-factor", authenticateJWT, (req, res, next) => {
  authController.toggleTwoFactor(req, res).catch(next);
});

export default router;

import express from "express";
import { body, param } from "express-validator";

import {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/authController.js";

import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  [
    body("email").isEmail().withMessage("Невалиден имейл адрес."),
    body("password").isLength({ min: 8 }).withMessage("Паролата трябва да е поне 8 символа."),
  ],
  validate,
  register
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Невалиден имейл адрес."),
    body("password").notEmpty().withMessage("Паролата е задължителна."),
  ],
  validate,
  login
);

router.post("/refresh", refresh);
router.post("/logout", logout);

router.get(
  "/verify-email/:token",
  [param("token").notEmpty()],
  validate,
  verifyEmail
);

router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().withMessage("Невалиден имейл адрес.")],
  validate,
  forgotPassword
);

router.post(
  "/reset-password/:token",
  authLimiter,
  [
    param("token").notEmpty(),
    body("password").isLength({ min: 8 }).withMessage("Паролата трябва да е поне 8 символа."),
  ],
  validate,
  resetPassword
);

router.post(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }).withMessage("Новата парола трябва да е поне 8 символа."),
  ],
  validate,
  changePassword
);

export default router;

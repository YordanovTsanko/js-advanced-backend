import express from "express";

import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import sessionRoutes from "./sessionRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import auditLogRoutes from "./auditLogRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/sessions", sessionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/audit-logs", auditLogRoutes);

export default router;

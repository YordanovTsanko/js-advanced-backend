import express from "express";

import { getAuditLogs } from "../controllers/auditLogController.js";
import { protect } from "../middleware/auth.js";
import restrictTo from "../middleware/restrictTo.js";

const router = express.Router();

router.use(protect, restrictTo("admin", "super_admin"));

router.get("/", getAuditLogs);

export default router;

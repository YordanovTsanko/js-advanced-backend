import express from "express";

import {
  getMySessions,
  revokeSession,
  revokeAllSessions,
} from "../controllers/sessionController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getMySessions);
router.delete("/all", revokeAllSessions);
router.delete("/:id", revokeSession);

export default router;

import express from "express";

import {
  getMe,
  updateMe,
  deleteMe,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";

import { protect } from "../middleware/auth.js";
import restrictTo from "../middleware/restrictTo.js";

const router = express.Router();

// All routes below require authentication
router.use(protect);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.delete("/me", deleteMe);

// Admin-only routes
router.use(restrictTo("admin", "super_admin"));

router.get("/", getUsers);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;

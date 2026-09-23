import express from "express";
import { param } from "express-validator";

import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from "../controllers/favoriteController.js";

import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";

const router = express.Router();

const productIdValidation = [
  param("productId").isMongoId().withMessage("Invalid product id"),
];

// Всички маршрути за любими продукти изискват профил
router.use(protect);

router.get("/", getFavorites);
router.get("/:productId", productIdValidation, validate, checkFavorite);
router.post("/:productId", productIdValidation, validate, addFavorite);
router.delete("/:productId", productIdValidation, validate, removeFavorite);

export default router;

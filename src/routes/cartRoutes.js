import express from "express";

import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} from "../controllers/cartController.js";

import { protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";

import {
  productIdParamValidation,
  addItemValidation,
  updateItemValidation,
} from "../validators/cartValidators.js";

const router = express.Router();

// Всички следващи рутове изискват автентикация
router.use(protect);

router.get("/", getCart);
router.post("/items", addItemValidation, validate, addItem);
router.patch("/items/:productId", updateItemValidation, validate, updateItem);
router.delete("/items/:productId", productIdParamValidation, validate, removeItem);
router.delete("/", clearCart);

export default router;

import express from "express";

import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
} from "../controllers/productController.js";

import { protect, optionalAuth } from "../middleware/auth.js";
import restrictTo from "../middleware/restrictTo.js";
import validate from "../middleware/validate.js";
import { uploadProductImages } from "../middleware/uploadImage.js";

import {
  createProductValidation,
  updateProductValidation,
  productIdParamValidation,
  listProductsValidation,
} from "../validators/productValidators.js";

const router = express.Router();

// Публични рутове (с опционална автентикация)
router.get("/", optionalAuth, listProductsValidation, validate, getProducts);
router.get(
  "/:id",
  optionalAuth,
  productIdParamValidation,
  validate,
  getProduct,
);

// Защита на следващите рутове — само за влезли администратори
router.use(protect, restrictTo("super_admin", "admin"));

router.post(
  "/",
  uploadProductImages,
  createProductValidation,
  validate,
  createProduct,
);
router.patch(
  "/:id",
  uploadProductImages,
  updateProductValidation,
  validate,
  updateProduct,
);

router.delete("/:id", productIdParamValidation, validate, deleteProduct);
router.patch(
  "/:id/restore",
  productIdParamValidation,
  validate,
  restoreProduct,
);

export default router;

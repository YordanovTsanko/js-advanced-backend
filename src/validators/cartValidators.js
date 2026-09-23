import { body, param } from "express-validator";

export const productIdParamValidation = [
  param("productId").isMongoId().withMessage("Invalid product id"),
];

export const addItemValidation = [
  body("productId").isMongoId().withMessage("Invalid product id"),
  body("quantity").isFloat({ gt: 0 }).withMessage("Quantity must be greater than 0"),
];

export const updateItemValidation = [
  param("productId").isMongoId().withMessage("Invalid product id"),
  body("quantity").isFloat({ gt: 0 }).withMessage("Quantity must be greater than 0"),
];

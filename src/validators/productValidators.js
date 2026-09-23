import { body, param, query } from "express-validator";

const objectIdParam = param("id").isMongoId().withMessage("Invalid id");

export const productIdParamValidation = [objectIdParam];

export const createProductValidation = [
  body("images").custom((value, { req }) => {
    if (!req.files || !req.files.length) {
      throw new Error("Images Error: Трябва да качите поне един файл.");
    }
    return true;
  }),

  body("name").isString().trim().isLength({ min: 1, max: 150 }),

  body("description").isString().trim().isLength({ min: 1, max: 5000 }),

  body("type").isIn(["vegetables", "fruits", "other"]),

  body("features")
    .optional()
    .customSanitizer((value) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      return value;
    })
    .isArray()
    .withMessage("Features трябва да бъде масив от данни.")
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      return value.every((feature) => typeof feature === "string");
    })
    .withMessage(
      "Всички елементи във features трябва да бъдат текстове (strings).",
    ),

  body("quantityType").isIn(["kg", "l", "piece"]),

  body("quantity").isFloat({ min: 0, max: 10000000 }),

  body("price")
    .isFloat({ min: 0, max: 10000000 })
    .custom((value) => /^\d+(\.\d{1,2})?$/.test(String(value))),
];

export const updateProductValidation = [
  param("id").isMongoId().withMessage("Invalid id"),

  body("images").custom((value, { req }) => {
    if (!req.files || !req.files.length) {
      throw new Error("Images Error: Трябва да качите поне един файл.");
    }
    return true;
  }),

  body("name").optional().isString().trim().isLength({ min: 1, max: 150 }),

  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 }),

  body("type").optional().isString().trim().isLength({ min: 1, max: 100 }),

  body("features")
    .optional()
    .customSanitizer((value) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      return value;
    })
    .isArray()
    .withMessage("Features трябва да бъде масив от данни.")
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      return value.every((feature) => typeof feature === "string");
    })
    .withMessage(
      "Всички елементи във features трябва да бъдат текстове (strings).",
    ),

  body("quantityType").optional().isIn(["kg", "l", "piece"]),

  body("quantity").optional().isFloat({ min: 0 }),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .custom((value) => /^\d+(\.\d{1,2})?$/.test(String(value))),

  body("isActive").optional().isBoolean(),
];
export const listProductsValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("quantityType").optional().isIn(["kg", "l", "piece"]),
  query("minPrice").optional().isFloat({ min: 0 }),
  query("maxPrice").optional().isFloat({ min: 0 }),
  query("isActive").optional().isBoolean(),
  query("sort")
    .optional()
    .isIn(["createdAt", "updatedAt", "name", "price", "quantity"]),
  query("order").optional().isIn(["asc", "desc"]),
];

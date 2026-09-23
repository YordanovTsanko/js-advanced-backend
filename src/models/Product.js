import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) =>
          Array.isArray(images) &&
          images.every(
            (img) => typeof img === "string" && img.trim().length > 0,
          ),
        message: "images must be an array of non-empty strings",
      },
    },
    type: {
      type: String,
      required: true,
      enum: ["vegetables", "fruits", "other"],
      index: true,
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: (features) =>
          Array.isArray(features) &&
          features.every((feature) => typeof feature === "string"),
        message: "features must be an array of strings",
      },
    },
    quantityType: {
      type: String,
      required: true,
      enum: ["kg", "l", "piece"],
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: (value) =>
          Number.isFinite(value) && /^\d+(\.\d{1,2})?$/.test(String(value)),
        message: "price must have at most 2 decimal places",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

productSchema.index({ type: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);
export default Product;

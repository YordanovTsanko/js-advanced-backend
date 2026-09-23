import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

const normalizeQuantity = (quantity, quantityType) => {
  const value = Number(quantity);

  if (!Number.isFinite(value) || value <= 0) return null;

  if (quantityType === "piece" && !Number.isInteger(value)) {
    return null;
  }

  return value;
};

const buildCartResponse = async (userId) => {
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: "items.product",
      match: { isActive: true },
    })
    .lean();

  if (!cart) {
    return {
      items: [],
      summary: {
        itemsCount: 0,
        subtotal: 0,
        total: 0,
      },
    };
  }

  let itemsCount = 0;
  let subtotal = 0;

  const items = [];

  for (const item of cart.items) {
    if (!item.product) continue;

    const lineTotal = Number((item.product.price * item.quantity).toFixed(2));

    itemsCount += item.quantity;
    subtotal += lineTotal;

    items.push({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.product.price,
      lineTotal,
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  return {
    items,
    summary: {
      itemsCount,
      subtotal,
      total: subtotal,
    },
  };
};

export const getCart = catchAsync(async (req, res) => {
  const data = await buildCartResponse(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

export const addItem = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    return next(new AppError("Invalid product id", 400));
  }

  const product = await Product.findById(productId);

  if (!product) return next(new AppError("Product not found", 404));
  if (!product.isActive) {
    return next(new AppError("Product is inactive", 409));
  }

  const normalized = normalizeQuantity(quantity, product.quantityType);

  if (normalized === null) {
    return next(new AppError(
      product.quantityType === "piece"
        ? "Quantity must be a positive integer"
        : "Quantity must be a positive number",
      400
    ));
  }

  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { user: req.user._id, items: [] } },
    { new: true, upsert: true }
  );

  const existingItem = cart.items.find(
    (item) => String(item.product) === String(product._id)
  );

  if (existingItem) {
    existingItem.quantity = Number(
      (existingItem.quantity + normalized).toFixed(6)
    );
  } else {
    cart.items.push({
      product: product._id,
      quantity: normalized,
    });
  }

  await cart.save();

  const data = await buildCartResponse(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

export const updateItem = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    return next(new AppError("Invalid product id", 400));
  }

  const product = await Product.findById(productId);

  if (!product) return next(new AppError("Product not found", 404));
  if (!product.isActive) {
    return next(new AppError("Product is inactive", 409));
  }

  const normalized = normalizeQuantity(quantity, product.quantityType);

  if (normalized === null) {
    return next(new AppError(
      product.quantityType === "piece"
        ? "Quantity must be a positive integer"
        : "Quantity must be a positive number",
      400
    ));
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) return next(new AppError("Cart is empty", 404));

  const item = cart.items.find(
    (cartItem) => String(cartItem.product) === String(productId)
  );

  if (!item) return next(new AppError("Product is not in cart", 404));

  item.quantity = normalized;
  await cart.save();

  const data = await buildCartResponse(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

export const removeItem = catchAsync(async (req, res) => {
  const { productId } = req.params;

  await Cart.updateOne(
    { user: req.user._id },
    { $pull: { items: { product: productId } } }
  );

  const data = await buildCartResponse(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

export const clearCart = catchAsync(async (req, res) => {
  await Cart.updateOne(
    { user: req.user._id },
    { $set: { items: [] } }
  );

  res.status(200).json({
    success: true,
    data: {
      items: [],
      summary: {
        itemsCount: 0,
        subtotal: 0,
        total: 0,
      },
    },
  });
});

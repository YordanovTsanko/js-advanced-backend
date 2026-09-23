import mongoose from "mongoose";
import Favorite from "../models/Favorite.js";
import Product from "../models/Product.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

export const getFavorites = catchAsync(async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "product",
      match: { isActive: true },
    })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      items: favorites.filter((favorite) => favorite.product),
    },
  });
});

export const addFavorite = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return next(new AppError("Invalid product id", 400));
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  });

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  await Favorite.updateOne(
    { user: req.user._id, product: product._id },
    { $setOnInsert: { user: req.user._id, product: product._id } },
    { upsert: true }
  );

  res.status(200).json({
    success: true,
    data: {
      productId: product._id,
      isFavorite: true,
    },
  });
});

export const removeFavorite = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return next(new AppError("Invalid product id", 400));
  }

  await Favorite.deleteOne({
    user: req.user._id,
    product: productId,
  });

  res.status(200).json({
    success: true,
    data: {
      productId,
      isFavorite: false,
    },
  });
});

export const checkFavorite = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return next(new AppError("Invalid product id", 400));
  }

  const isFavorite = !!(await Favorite.exists({
    user: req.user._id,
    product: productId,
  }));

  res.status(200).json({
    success: true,
    data: {
      productId,
      isFavorite,
    },
  });
});

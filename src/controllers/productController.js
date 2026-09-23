import mongoose from "mongoose";
import Product from "../models/Product.js";
import Favorite from "../models/Favorite.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

const buildFilter = (query, user) => {
  const filter = {};

  const isAdmin = user?.role === "admin";

  // Public users и обикновени users НИКОГА не могат
  // да поискат inactive продукти чрез query параметър.
  if (isAdmin && query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  } else {
    filter.isActive = true;
  }

  if (query.type) {
    filter.type = query.type;
  }

  if (query.quantityType) {
    filter.quantityType = query.quantityType;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};

    if (query.minPrice !== undefined) {
      filter.price.$gte = Number(query.minPrice);
    }

    if (query.maxPrice !== undefined) {
      filter.price.$lte = Number(query.maxPrice);
    }
  }

  if (query.search?.trim()) {
    filter.$text = {
      $search: query.search.trim(),
    };
  }

  return filter;
};

export const getProducts = catchAsync(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const filter = buildFilter(req.query, req.user);

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "name",
    "price",
    "quantity",
  ];

  const sortField = allowedSortFields.includes(req.query.sort)
    ? req.query.sort
    : "createdAt";

  const sortDirection = req.query.order === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),

    Product.countDocuments(filter),
  ]);

  if (req.user) {
    const productIds = items.map((item) => item._id);

    const favorites = await Favorite.find({
      user: req.user._id,
      product: { $in: productIds },
    })
      .select("product")
      .lean();

    const favoriteIds = new Set(favorites.map((item) => String(item.product)));

    for (const item of items) {
      item.isFavorite = favoriteIds.has(String(item._id));
    }
  }

  res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getProduct = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Invalid product id", 400));
  }

  const product = await Product.findOne({
    _id: req.params.id,
    isActive: true,
  }).lean();

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  if (req.user) {
    product.isFavorite = !!(await Favorite.exists({
      user: req.user._id,
      product: product._id,
    }));
  }

  res.status(200).json({
    success: true,
    data: { product },
  });
});

export const createProduct = catchAsync(async (req, res) => {
  const { name, description, type, quantityType, quantity, price } = req.body;
  let features = [];
  if (req.body.features) {
    try {
      features =
        typeof req.body.features === "string"
          ? JSON.parse(req.body.features)
          : req.body.features;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Невалидни характеристики на продукта.",
      });
    }
  }
  if (!Array.isArray(features)) {
    return res.status(400).json({
      success: false,
      message: "Характеристиките трябва да бъдат масив.",
    });
  }
  if (features.length > 0) {
    features = features
      .map((feature) => String(feature).trim())
      .filter(Boolean);
  }
  const images = Array.isArray(req.uploadedImages)
    ? req.uploadedImages.slice(0, 5)
    : [];
  const product = await Product.create({
    name: name?.trim(),
    description: description?.trim(),
    images,
    type,
    features,
    quantityType,
    quantity: Number(quantity),
    price: Number(price),
  });
  res.status(201).json({ success: true, data: { product } });
});

export const updateProduct = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Invalid product id", 400));
  }

  const allowed = [
    "name",
    "description",
    "type",
    "features",
    "quantityType",
    "quantity",
    "price",
    "isActive",
  ];

  const update = {};

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      update[field] = req.body[field];
    }
  }

  // images никога не идват директно от req.body.
  // Ако има успешно качена снимка през middleware-а,
  // тя е trusted и може да обнови images.
  if (Array.isArray(req.uploadedImages) && req.uploadedImages.length > 0) {
    update.images = req.uploadedImages;
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

export const deleteProduct = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Invalid product id", 400));
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false } },
    { new: true },
  );

  if (!product) return next(new AppError("Product not found", 404));

  res.status(200).json({
    success: true,
    data: { product },
  });
});

export const restoreProduct = catchAsync(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(new AppError("Invalid product id", 400));
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: true } },
    { new: true },
  );

  if (!product) return next(new AppError("Product not found", 404));

  res.status(200).json({
    success: true,
    data: { product },
  });
});

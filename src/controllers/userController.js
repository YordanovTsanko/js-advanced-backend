import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

// Whitelist of fields a user is allowed to change on their own profile.
const filterAllowedFields = (body, allowedFields) => {
  const filtered = {};
  Object.keys(body).forEach((key) => {
    if (allowedFields.includes(key)) filtered[key] = body[key];
  });
  return filtered;
};

// =========================
// ME (current user)
// =========================
export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: "success", data: { user: req.user } });
});

export const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password) {
    return next(
      new AppError("Използвайте /auth/change-password за смяна на паролата.", 400)
    );
  }

  const allowedFields = [
    "firstName",
    "lastName",
    "username",
    "phone",
    "avatar",
    "bio",
    "preferences",
    "address",
  ];
  const filteredBody = filterAllowedFields(req.body, allowedFields);

  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: "success", data: { user: updatedUser } });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    deleted: true,
    deletedAt: new Date(),
    status: "inactive",
  });

  res.status(204).json({ status: "success", data: null });
});

// =========================
// ADMIN: manage any user
// =========================
export const getUsers = catchAsync(async (req, res, next) => {
  const { role, status, page = 1, limit = 25 } = req.query;

  const filter = { deleted: false };
  if (role) filter.role = role;
  if (status) filter.status = status;

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(filter);

  res.status(200).json({
    status: "success",
    results: users.length,
    total,
    page: Number(page),
    data: { users },
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user || user.deleted) {
    return next(new AppError("Потребителят не е намерен.", 404));
  }

  res.status(200).json({ status: "success", data: { user } });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const allowedFields = ["role", "status", "firstName", "lastName", "phone"];
  const filteredBody = filterAllowedFields(req.body, allowedFields);

  const before = await User.findById(req.params.id);
  if (!before) {
    return next(new AppError("Потребителят не е намерен.", 404));
  }

  const updatedUser = await User.findByIdAndUpdate(req.params.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  await AuditLog.create({
    actor: req.user._id,
    action: "user.update",
    entityType: "User",
    entityId: updatedUser._id,
    changes: { before: before.toJSON(), after: updatedUser.toJSON() },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json({ status: "success", data: { user: updatedUser } });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, {
    deleted: true,
    deletedAt: new Date(),
    status: "inactive",
  });

  if (!user) {
    return next(new AppError("Потребителят не е намерен.", 404));
  }

  await AuditLog.create({
    actor: req.user._id,
    action: "user.delete",
    entityType: "User",
    entityId: user._id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(204).json({ status: "success", data: null });
});

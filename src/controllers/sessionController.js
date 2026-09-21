import Session from "../models/Session.js";
import RefreshToken from "../models/RefreshToken.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const getMySessions = catchAsync(async (req, res, next) => {
  const sessions = await Session.find({
    user: req.user._id,
    isActive: true,
  }).sort({ lastActivityAt: -1 });

  res.status(200).json({
    status: "success",
    results: sessions.length,
    data: { sessions },
  });
});

export const revokeSession = catchAsync(async (req, res, next) => {
  const session = await Session.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!session) {
    return next(new AppError("Сесията не е намерена.", 404));
  }

  await session.revoke();

  // Also revoke the matching refresh token so it can't be used again
  await RefreshToken.updateOne(
    { tokenHash: session.sessionToken },
    { revoked: true, revokedAt: new Date() }
  );

  res.status(200).json({ status: "success", message: "Сесията е прекратена." });
});

export const revokeAllSessions = catchAsync(async (req, res, next) => {
  await Session.updateMany(
    { user: req.user._id, isActive: true },
    { isActive: false, revokedAt: new Date() }
  );

  await RefreshToken.updateMany(
    { user: req.user._id, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );

  res.status(200).json({
    status: "success",
    message: "Всички сесии са прекратени.",
  });
});

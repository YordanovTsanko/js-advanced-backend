import User from "../models/User.js";
import Session from "../models/Session.js";
import LoginHistory from "../models/LoginHistory.js";
import RefreshToken from "../models/RefreshToken.js";
import PasswordReset from "../models/PasswordReset.js";

import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import sendEmail from "../utils/sendEmail.js";
import { generateRawToken, hashToken } from "../utils/tokenUtils.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  expiresInToDate,
  REFRESH_EXPIRES_IN,
} from "../utils/jwt.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// Creates access + refresh tokens, and persists Session + RefreshToken
// records so sessions can be listed/revoked later.
const issueTokensForUser = async (user, req) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const expiresAt = expiresInToDate(REFRESH_EXPIRES_IN);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    expiresAt,
  });

  await Session.create({
    user: user._id,
    sessionToken: hashToken(refreshToken),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    expiresAt,
  });

  return { accessToken, refreshToken };
};

// =========================
// REGISTER
// =========================
export const register = catchAsync(async (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError("Вече съществува потребител с този имейл.", 409));
  }

  const user = await User.create({ email, password, firstName, lastName });

  const rawVerificationToken = generateRawToken();
  user.emailVerificationToken = hashToken(rawVerificationToken);
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.APP_URL}/verify-email/${rawVerificationToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Потвърдете имейл адреса си",
      text: `Потвърдете имейла си тук: ${verifyUrl}`,
      // html: `<p>Потвърдете имейла си, като кликнете <a href="${verifyUrl}">тук</a>.</p>`,
    });
  } catch (err) {
    // Registration still succeeds even if the email fails to send;
    // the user can request a new verification email later.
    console.error("Failed to send verification email:", err.message);
  }

  const { accessToken, refreshToken } = await issueTokensForUser(user, req);

  res.status(201).json({
    status: "success",
    accessToken,
    refreshToken,
    data: { user },
  });
});

// =========================
// LOGIN
// =========================
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Моля, въведете имейл и парола.", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  const recordFailedLogin = async (reason) => {
    await LoginHistory.create({
      user: user ? user._id : null,
      success: false,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      failureReason: reason,
    });
  };

  if (!user) {
    return next(new AppError("Грешен имейл или парола.", 401));
  }

  if (user.isAccountLocked()) {
    await recordFailedLogin("account_locked");
    return next(
      new AppError(
        "Акаунтът е временно заключен поради много неуспешни опити. Опитайте по-късно.",
        423,
      ),
    );
  }

  if (user.status === "inactive") {
    await recordFailedLogin("account_inactive");
    return next(new AppError("Достъпа до акаунта е ограничен.", 403));
  }

  if (user.status === "suspended") {
    await recordFailedLogin("account_suspended");
    return next(
      new AppError(
        "Временно достъпът до акаунта е ограничен. Моля свържете се с нас за съдействие.",
        403,
      ),
    );
  }

  if (user.status === "banned") {
    await recordFailedLogin("account_banned");
    return next(new AppError("Акаунтът е блокиран.", 403));
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }

    await user.save({ validateBeforeSave: false });
    await recordFailedLogin("invalid_credentials");

    return next(new AppError("Грешен имейл или парола.", 401));
  }

  // Successful login: reset lockout counters
  user.failedLoginAttempts = 0;
  user.lockUntil = 10;
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;
  user.lastLoginUserAgent = req.headers["user-agent"];
  await user.save({ validateBeforeSave: false });

  await LoginHistory.create({
    user: user._id,
    success: true,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const { accessToken, refreshToken } = await issueTokensForUser(user, req);

  res.status(200).json({
    status: "success",
    accessToken,
    refreshToken,
    data: { user },
  });
});

// =========================
// REFRESH ACCESS TOKEN
// =========================
export const refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(
      new AppError("Липсва токен. Моля свържете се с нас за съдействие.", 400),
    );
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    return next(new AppError("Невалиден или изтекъл refresh token.", 401));
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({ tokenHash });

  if (!storedToken || !storedToken.isActive()) {
    return next(new AppError("Refresh token-ът е отменен или невалиден.", 401));
  }

  const user = await User.findById(decoded.sub);
  if (!user || user.deleted || (!user.isActive() && !user.isPending())) {
    return next(
      new AppError("Потребителят не е намерен или достъпът е ограничен.", 401),
    );
  }

  // Rotate: revoke old refresh token, issue a new pair
  const newRefreshToken = generateRefreshToken(user._id);
  await storedToken.revoke(newRefreshToken);

  const newAccessToken = generateAccessToken(user._id);
  const expiresAt = expiresInToDate(REFRESH_EXPIRES_IN);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(newRefreshToken),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    expiresAt,
  });

  res.status(200).json({
    status: "success",
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// =========================
// LOGOUT
// =========================
export const logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateOne(
      { tokenHash },
      { revoked: true, revokedAt: new Date() },
    );
    await Session.updateOne(
      { sessionToken: tokenHash },
      { isActive: false, revokedAt: new Date() },
    );
  }

  res.status(200).json({ status: "success", message: "Излязохте успешно." });
});

// =========================
// VERIFY EMAIL
// =========================
export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const tokenHash = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpires: { $gt: Date.now() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    return next(
      new AppError("Токенът за потвърждение е невалиден или изтекъл.", 400),
    );
  }

  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  if (user.status === "pending") user.status = "active";
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json({ status: "success", message: "Имейлът е потвърден успешно." });
});

// =========================
// FORGOT PASSWORD
// =========================
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond with 200 to avoid leaking whether an email is registered
  const genericResponse = () =>
    res.status(200).json({
      status: "success",
      message:
        "Ако имейлът съществува, е изпратена връзка за нулиране на паролата.",
    });

  if (!user) return genericResponse();

  const rawToken = generateRawToken();

  await PasswordReset.create({
    user: user._id,
    tokenHash: hashToken(rawToken),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  const resetUrl = `${process.env.APP_URL}/reset-password/${rawToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Нулиране на парола",
      text: `Нулирайте паролата си тук: ${resetUrl}`,
      html: `<p>Нулирайте паролата си, като кликнете <a href="${resetUrl}">тук</a>. Връзката е валидна 1 час.</p>`,
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err.message);
  }

  genericResponse();
});

// =========================
// RESET PASSWORD
// =========================
export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  const tokenHash = hashToken(token);

  const resetRequest = await PasswordReset.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: Date.now() },
  }).select("+tokenHash");

  if (!resetRequest) {
    return next(
      new AppError("Връзката за нулиране е невалидна или изтекла.", 400),
    );
  }

  const user = await User.findById(resetRequest.user);
  if (!user) {
    return next(new AppError("Потребителят не е намерен.", 404));
  }

  user.password = password;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  await resetRequest.markUsed();

  // Revoke all existing refresh tokens/sessions for security
  await RefreshToken.updateMany(
    { user: user._id, revoked: false },
    { revoked: true, revokedAt: new Date() },
  );
  await Session.updateMany(
    { user: user._id, isActive: true },
    { isActive: false, revokedAt: new Date() },
  );

  res
    .status(200)
    .json({ status: "success", message: "Паролата е сменена успешно." });
});

// =========================
// CHANGE PASSWORD (logged in)
// =========================
export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError("Текущата парола е грешна.", 401));
  }

  user.password = newPassword;
  await user.save();

  res
    .status(200)
    .json({ status: "success", message: "Паролата е сменена успешно." });
});

import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { verifyAccessToken } from "../utils/jwt.js";

// Protects a route: requires a valid Bearer access token.
// Attaches the authenticated user document to req.user.
export const protect = catchAsync(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError(
        "Не сте влезли в профила си. Моля, влезте, за да продължите.",
        401,
      ),
    );
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return next(
      new AppError("Невалиден или изтекъл токен. Моля, влезте отново.", 401),
    );
  }

  const currentUser = await User.findById(decoded.sub);

  if (!currentUser || currentUser.deleted) {
    return next(
      new AppError(
        "Потребителят, свързан с този токен, вече не съществува.",
        401,
      ),
    );
  }

  if (!currentUser.isActive() && !currentUser.isPending()) {
    return next(
      new AppError(
        "Достъпът до акаунта е ограничен. Моля, свържете се с поддръжката.",
        403,
      ),
    );
  }

  if (
    currentUser.passwordChangedAt &&
    decoded.iat * 1000 < currentUser.passwordChangedAt.getTime()
  ) {
    return next(
      new AppError("Паролата е сменена наскоро. Моля, влезте отново.", 401),
    );
  }

  req.user = currentUser;
  next();
});

// Optional auth: attaches req.user if a valid token is present,
// but does not block the request if it's missing/invalid.
export const optionalAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = verifyAccessToken(token);
      const currentUser = await User.findById(decoded.sub);
      if (currentUser && !currentUser.deleted) {
        req.user = currentUser;
      }
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }

  next();
});

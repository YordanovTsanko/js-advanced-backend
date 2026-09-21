import AppError from "../utils/AppError.js";

// Usage: router.get("/admin", protect, restrictTo("admin", "super_admin"), handler)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Не сте влезли в профила си.", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("Нямате права за извършване на това действие.", 403)
      );
    }

    next();
  };
};

export default restrictTo;

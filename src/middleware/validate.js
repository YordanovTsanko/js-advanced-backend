import { validationResult } from "express-validator";
import AppError from "../utils/AppError.js";

// Place after an array of express-validator check(...) chains in a route:
// router.post("/register", [check("email").isEmail(), ...], validate, controller)
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(", ");
    return next(new AppError(message, 400));
  }

  next();
};

export default validate;

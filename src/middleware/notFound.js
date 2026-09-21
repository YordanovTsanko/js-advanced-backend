import AppError from "../utils/AppError.js";

// Place after all routes, before errorHandler.
const notFound = (req, res, next) => {
  next(new AppError(`Не е намерен маршрут: ${req.originalUrl}`, 404));
};

export default notFound;

import AppError from "../utils/AppError.js";

const handleCastErrorDB = (err) => {
  return new AppError(`Невалидна стойност за поле ${err.path}: ${err.value}`, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue ? err.keyValue[field] : "";
  return new AppError(`Стойността "${value}" за поле "${field}" вече съществува.`, 409);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Невалидни данни: ${messages.join(". ")}`, 400);
};

const handleJWTError = () =>
  new AppError("Невалиден токен. Моля, влезте отново.", 401);

const handleJWTExpiredError = () =>
  new AppError("Токенът е изтекъл. Моля, влезте отново.", 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Unknown / programming error: don't leak details
  console.error("UNEXPECTED ERROR:", err);
  return res.status(500).json({
    status: "error",
    message: "Нещо се обърка. Опитайте отново по-късно.",
  });
};

// Must be registered LAST, after all routes: app.use(errorHandler)
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
    return;
  }

  let error = Object.assign(
    Object.create(Object.getPrototypeOf(err)),
    err
  );
  error.message = err.message;

  if (error.name === "CastError") error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === "ValidationError") error = handleValidationErrorDB(error);
  if (error.name === "JsonWebTokenError") error = handleJWTError();
  if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

  sendErrorProd(error, res);
};

export default errorHandler;

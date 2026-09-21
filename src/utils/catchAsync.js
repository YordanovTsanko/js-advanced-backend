// Wraps an async controller function so rejected promises are
// forwarded to Express' error-handling middleware instead of
// requiring a try/catch block in every controller.
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;

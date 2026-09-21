import rateLimit from "express-rate-limit";

// Generic limiter for login/register/password-reset endpoints,
// to slow down brute-force and credential-stuffing attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Твърде много опити. Опитайте отново след 15 минути.",
  },
});

// Looser limiter for general API traffic.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

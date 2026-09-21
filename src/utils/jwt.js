import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "change-me-access";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "change-me-refresh";

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

export const generateAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ sub: userId }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

// Converts "30d" / "15m" style strings into a millisecond duration,
// used to set expiresAt on Session / RefreshToken documents.
export const expiresInToDate = (expiresIn) => {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return new Date(Date.now() + 15 * 60 * 1000); // fallback: 15 min

  const value = Number(match[1]);
  const unit = match[2];

  const unitMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * unitMs[unit]);
};

export const ACCESS_EXPIRES_IN = ACCESS_TOKEN_EXPIRES_IN;
export const REFRESH_EXPIRES_IN = REFRESH_TOKEN_EXPIRES_IN;

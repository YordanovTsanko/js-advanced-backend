import crypto from "crypto";

// Raw token: sent to the user (email link, refresh token cookie, etc.)
// Hashed token: what we actually store in the database, so a leaked
// DB dump never exposes usable tokens.
export const generateRawToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

export const hashToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

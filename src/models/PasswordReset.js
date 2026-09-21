import mongoose from "mongoose";
import crypto from "crypto";

const passwordResetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    ip: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    used: {
      type: Boolean,
      default: false,
    },

    usedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index, auto-removed on expiry
    },
  },
  {
    timestamps: true,
  }
);

passwordResetSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

passwordResetSchema.methods.isExpired = function () {
  return this.expiresAt <= new Date();
};

passwordResetSchema.methods.markUsed = function () {
  this.used = true;
  this.usedAt = new Date();
  return this.save();
};

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);

export default PasswordReset;

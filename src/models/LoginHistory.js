import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    success: {
      type: Boolean,
      required: true,
      index: true,
    },

    ip: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    location: {
      country: { type: String, default: null },
      city: { type: String, default: null },
    },

    failureReason: {
      type: String,
      enum: [
        null,
        "invalid_credentials",
        "account_inactive",
        "account_suspended",
        "account_banned",
        "email_not_verified",
        "two_factor_failed",
      ],
      default: null,
    },

    loginAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

loginHistorySchema.index({ user: 1, loginAt: -1 });

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

export default LoginHistory;

import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
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

    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedByToken: {
      type: String,
      default: null,
      select: false,
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

refreshTokenSchema.index({ user: 1, revoked: 1 });

refreshTokenSchema.methods.isActive = function () {
  return !this.revoked && this.expiresAt > new Date();
};

refreshTokenSchema.methods.revoke = function (replacedByToken = null) {
  this.revoked = true;
  this.revokedAt = new Date();
  if (replacedByToken) this.replacedByToken = replacedByToken;
  return this.save();
};

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;

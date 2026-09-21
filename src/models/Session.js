import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sessionToken: {
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

    device: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index, document removed at expiresAt
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ user: 1, isActive: 1 });

sessionSchema.methods.isExpired = function () {
  return this.expiresAt <= new Date();
};

sessionSchema.methods.revoke = function () {
  this.isActive = false;
  this.revokedAt = new Date();
  return this.save();
};

const Session = mongoose.model("Session", sessionSchema);

export default Session;

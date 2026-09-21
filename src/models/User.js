import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFO
    // =========================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: null,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },

    // =========================
    // ROLE & ACCOUNT STATUS
    // =========================
    role: {
      type: String,
      enum: ["user", "moderator", "admin", "super_admin"],
      default: "user",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "banned", "pending"],
      default: "pending",
      index: true,
    },

    // =========================
    // VERIFICATION
    // =========================
    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerifiedAt: {
      type: Date,
      default: null,
    },

    // =========================
    // PASSWORD / SECURITY
    // =========================
    passwordChangedAt: {
      type: Date,
      default: null,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      select: false,
    },

    // =========================
    // LOGIN INFORMATION
    // =========================
    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: null,
      select: false,
    },

    lastLoginUserAgent: {
      type: String,
      default: null,
      select: false,
    },

    // =========================
    // PREFERENCES
    // =========================
    preferences: {
      language: {
        type: String,
        default: "en",
      },

      timezone: {
        type: String,
        default: "UTC",
      },

      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },

      marketingEmails: {
        type: Boolean,
        default: true,
      },

      notifications: {
        type: Boolean,
        default: true,
      },
    },

    // =========================
    // ADDRESS
    // =========================
    address: {
      country: {
        type: String,
        default: null,
      },

      city: {
        type: String,
        default: null,
      },

      state: {
        type: String,
        default: null,
      },

      postalCode: {
        type: String,
        default: null,
      },

      street: {
        type: String,
        default: null,
      },
    },

    // =========================
    // SOCIAL / EXTERNAL ACCOUNTS
    // =========================
    socialAccounts: {
      googleId: {
        type: String,
        default: null,
        select: false,
      },

      githubId: {
        type: String,
        default: null,
        select: false,
      },

      facebookId: {
        type: String,
        default: null,
        select: false,
      },
    },

    // =========================
    // SUBSCRIPTION
    // =========================
    subscription: {
      plan: {
        type: String,
        enum: ["free", "basic", "pro", "enterprise"],
        default: "free",
      },

      status: {
        type: String,
        enum: ["active", "trialing", "past_due", "canceled", "expired"],
        default: "active",
      },

      startedAt: {
        type: Date,
        default: null,
      },

      expiresAt: {
        type: Date,
        default: null,
      },
    },

    // =========================
    // ACCOUNT MANAGEMENT
    // =========================
    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,

    // Prevent fields that start with $ or contain dots
    strict: true,

    // Don't allow unnecessary internal fields in JSON
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.twoFactorSecret;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.lastLoginIp;
        delete ret.lastLoginUserAgent;

        return ret;
      },
    },
  },
);

// =========================
// INDEXES
// =========================

userSchema.index({ role: 1, status: 1 });
userSchema.index({ "subscription.plan": 1 });
userSchema.index({ createdAt: -1 });

// =========================
// PASSWORD HASHING
// =========================

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();

  next();
});

// =========================
// PASSWORD CHECK
// =========================

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// =========================
// ACCOUNT HELPERS
// =========================

userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.isActive = function () {
  return this.status === "active" && !this.deleted;
};
userSchema.methods.isPending = function () {
  return this.status === "pending" && !this.deleted;
};

userSchema.methods.hasRole = function (...roles) {
  return roles.includes(this.role);
};

// =========================
// MODEL
// =========================

const User = mongoose.model("User", userSchema);

export default User;

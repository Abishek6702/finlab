const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    // Basic profile
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please add a valid email",
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    profileImage: {
      type: String,
      default: "",
    },

    // Authentication
    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function () {
        return this.authProvider === "email";
      },
    },
    authProvider: {
      type: String,
      enum: ["email", "google", "both"],
      default: "email",
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // Password reset
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // User preferences
    country: {
      type: String,
      trim: true,
      default: "IN",
    },
    baseCurrency: {
      type: String,
      trim: true,
      default: "INR",
    },
    timezone: {
      type: String,
      trim: true,
      default: "IST",
    },
    language: {
      type: String,
      trim: true,
      default: "en",
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
      set: (val) => (val === "dark" ? "dark" : "light"),
    },
    weekStartsOn: {
      type: String,
      enum: ["Monday", "Sunday"],
      default: "Monday",
    },
    // Accounts without this marker get one onboarding pass; completion is stored server-side.
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
        delete ret.__v;
        if (ret.theme !== "dark") ret.theme = "light";
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
        delete ret.__v;
        if (ret.theme !== "dark") ret.theme = "light";
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// Helper to detect if a password string is already a bcrypt hash
const isBcryptHash = (str) =>
  typeof str === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);

// Ensure theme is always strictly "light" or "dark", defaulting to "light"
userSchema.pre("validate", function () {
  if (this.theme !== "dark") {
    this.theme = "light";
  }
});

userSchema.post("init", function () {
  if (this.theme !== "dark") {
    this.theme = "light";
  }
});

userSchema.pre("save", async function () {
  // If password was not modified, exit immediately
  if (!this.isModified("password") || !this.password) {
    return;
  }

  // Prevent double hashing
  if (!isBcryptHash(this.password)) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Update passwordChangedAt when password is modified, except for newly created accounts
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model("User", userSchema);

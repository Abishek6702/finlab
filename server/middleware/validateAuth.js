const Joi = require("joi");

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "First name is required",
    "string.min": "First name must be at least 2 characters",
  }),
  lastName: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "Last name is required",
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      "string.empty": "Password is required",
    }),
  phone: Joi.string().trim().allow("", null).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

const googleAuthSchema = Joi.object({
  idToken: Joi.string().required().messages({
    "string.empty": "Google ID token is required",
  }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "New password must be at least 8 characters long",
      "string.pattern.base": "New password must contain at least one uppercase letter, one lowercase letter, and one number",
      "string.empty": "New password is required",
    }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "New password must be at least 8 characters long",
      "string.pattern.base": "New password must contain at least one uppercase letter, one lowercase letter, and one number",
      "string.empty": "New password is required",
    }),
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).optional(),
  lastName: Joi.string().trim().min(1).max(50).optional(),
  phone: Joi.string().trim().allow("", null).optional(),
  profileImage: Joi.string().uri().allow("", null).optional(),
  country: Joi.string().trim().max(10).optional(),
  baseCurrency: Joi.string().trim().max(10).optional(),
  timezone: Joi.string().trim().max(50).optional(),
  language: Joi.string().trim().max(10).optional(),
  theme: Joi.string().valid("light", "dark", "system").optional(),
  weekStartsOn: Joi.string().valid("Monday", "Sunday").optional(),
}).min(1);

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }
    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
};

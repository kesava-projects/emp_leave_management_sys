import rateLimit from "express-rate-limit";

// Rate limiting for login route (10 requests per 15 minutes per IP in production/dev)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts. Please try again after 15 minutes.",
    },
  },
});

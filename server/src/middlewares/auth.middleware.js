import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Also support Authorization header for testing flexibility
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User session invalid or account inactive",
        },
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
    });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action",
        },
      });
    }

    next();
  };
};

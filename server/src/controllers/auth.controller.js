import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "Your account is deactivated. Please contact HR.",
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, cookieOptions);

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      managerId: user.managerId,
      joinDate: user.joinDate,
      isActive: user.isActive,
    };

    return res.status(200).json({
      user: safeUser,
      token, // Also return in response body for flexibility (APIs, mobile, testing)
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.status(200).json({ message: "Successfully logged out" });
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-passwordHash")
    .populate("managerId", "name email");

  return res.status(200).json({ user });
};

import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { LeaveType } from "../models/LeaveType.js";
import { Holiday } from "../models/Holiday.js";
import { LeaveBalance } from "../models/LeaveBalance.js";

// ==================== USERS CRUD ====================
export const getUsers = async (req, res, next) => {
  try {
    const { department, role, search } = req.query;
    const filter = {};

    if (department) filter.department = department;
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .populate("managerId", "name email")
      .sort({ name: 1 });

    return res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-passwordHash")
      .populate("managerId", "name email");

    if (!user) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, managerId, joinDate, isActive } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        error: { code: "USER_EXISTS", message: "A user with this email already exists" },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      department,
      managerId: managerId || null,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      isActive: isActive !== undefined ? isActive : true,
    });

    // Initialize balances for current year
    const currentYear = new Date().getUTCFullYear();
    const leaveTypes = await LeaveType.find();
    const balanceDocs = leaveTypes.map((lt) => ({
      userId: user._id,
      leaveTypeId: lt._id,
      year: currentYear,
      allocated: lt.isPaid ? lt.yearlyAllowance : 0,
      carriedOver: 0,
      used: 0,
      pending: 0,
    }));

    if (balanceDocs.length > 0) {
      await LeaveBalance.create(balanceDocs);
    }

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    return res.status(201).json({ user: safeUser });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, department, managerId, joinDate, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({
          error: { code: "EMAIL_IN_USE", message: "Email is already in use by another user" },
        });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (department) user.department = department;
    if (managerId !== undefined) user.managerId = managerId || null;
    if (joinDate) user.joinDate = new Date(joinDate);
    if (isActive !== undefined) user.isActive = isActive;

    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    return res.status(200).json({ user: safeUser });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    // Soft delete by deactivating
    user.isActive = false;
    await user.save();

    return res.status(200).json({ message: "User deactivated successfully" });
  } catch (err) {
    next(err);
  }
};

// ==================== LEAVE TYPES CRUD ====================
export const getLeaveTypes = async (req, res, next) => {
  try {
    const leaveTypes = await LeaveType.find().sort({ name: 1 });
    return res.status(200).json({ leaveTypes });
  } catch (err) {
    next(err);
  }
};

export const createLeaveType = async (req, res, next) => {
  try {
    const { name, yearlyAllowance, carryOverLimit, color, requiresApproval, isPaid } = req.body;

    const existing = await LeaveType.findOne({ name: { $regex: `^${name.trim()}$`, $options: "i" } });
    if (existing) {
      return res.status(409).json({
        error: { code: "LEAVE_TYPE_EXISTS", message: "A leave type with this name already exists" },
      });
    }

    const leaveType = await LeaveType.create({
      name: name.trim(),
      yearlyAllowance: yearlyAllowance ?? 0,
      carryOverLimit: carryOverLimit ?? 0,
      color: color || "#3b82f6",
      requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
      isPaid: isPaid !== undefined ? isPaid : true,
    });

    // Populate balances for all existing users for current year
    const currentYear = new Date().getUTCFullYear();
    const users = await User.find({ isActive: true });
    const balanceDocs = users.map((u) => ({
      userId: u._id,
      leaveTypeId: leaveType._id,
      year: currentYear,
      allocated: leaveType.isPaid ? leaveType.yearlyAllowance : 0,
      carriedOver: 0,
      used: 0,
      pending: 0,
    }));

    if (balanceDocs.length > 0) {
      await LeaveBalance.insertMany(balanceDocs, { ordered: false }).catch(() => {});
    }

    return res.status(201).json({ leaveType });
  } catch (err) {
    next(err);
  }
};

export const updateLeaveType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, yearlyAllowance, carryOverLimit, color, requiresApproval, isPaid } = req.body;

    const leaveType = await LeaveType.findById(id);
    if (!leaveType) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Leave type not found" },
      });
    }

    if (name) leaveType.name = name.trim();
    if (yearlyAllowance !== undefined) leaveType.yearlyAllowance = yearlyAllowance;
    if (carryOverLimit !== undefined) leaveType.carryOverLimit = carryOverLimit;
    if (color) leaveType.color = color;
    if (requiresApproval !== undefined) leaveType.requiresApproval = requiresApproval;
    if (isPaid !== undefined) leaveType.isPaid = isPaid;

    await leaveType.save();
    return res.status(200).json({ leaveType });
  } catch (err) {
    next(err);
  }
};

export const deleteLeaveType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leaveType = await LeaveType.findByIdAndDelete(id);
    if (!leaveType) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Leave type not found" },
      });
    }

    return res.status(200).json({ message: "Leave type deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ==================== HOLIDAYS CRUD ====================
export const getHolidays = async (req, res, next) => {
  try {
    const { year } = req.query;
    const filter = {};

    if (year) {
      const y = parseInt(year, 10);
      const start = new Date(Date.UTC(y, 0, 1));
      const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      filter.date = { $gte: start, $lte: end };
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });
    return res.status(200).json({ holidays });
  } catch (err) {
    next(err);
  }
};

export const createHoliday = async (req, res, next) => {
  try {
    const { date, name } = req.body;
    const holidayDate = new Date(date);
    holidayDate.setUTCHours(0, 0, 0, 0);

    const existing = await Holiday.findOne({ date: holidayDate });
    if (existing) {
      return res.status(409).json({
        error: { code: "HOLIDAY_EXISTS", message: "A holiday already exists on this date" },
      });
    }

    const holiday = await Holiday.create({
      date: holidayDate,
      name: name.trim(),
    });

    return res.status(201).json({ holiday });
  } catch (err) {
    next(err);
  }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Holiday not found" },
      });
    }

    return res.status(200).json({ message: "Holiday deleted successfully" });
  } catch (err) {
    next(err);
  }
};

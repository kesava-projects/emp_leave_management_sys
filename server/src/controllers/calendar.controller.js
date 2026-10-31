import { LeaveRequest } from "../models/LeaveRequest.js";
import { User } from "../models/User.js";
import { Holiday } from "../models/Holiday.js";

export const getCalendar = async (req, res, next) => {
  try {
    const monthQuery = req.query.month; // Expected YYYY-MM
    let year, monthIndex;

    if (monthQuery && /^\d{4}-\d{2}$/.test(monthQuery)) {
      const parts = monthQuery.split("-");
      year = parseInt(parts[0], 10);
      monthIndex = parseInt(parts[1], 10) - 1; // 0-based
    } else {
      const now = new Date();
      year = now.getUTCFullYear();
      monthIndex = now.getUTCMonth();
    }

    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    // Last day of month
    const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    const daysInMonth = endOfMonth.getUTCDate();

    // 1. Get holidays in this month
    const holidays = await Holiday.find({
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: 1 }).lean();

    // 2. Determine target users
    let users = [];
    if (req.user.role === "admin") {
      users = await User.find({ isActive: true }).select("_id name email department role").lean();
    } else if (req.user.role === "manager") {
      // Manager + direct reports
      users = await User.find({
        $or: [{ _id: req.user._id }, { managerId: req.user._id }],
        isActive: true,
      })
        .select("_id name email department role")
        .lean();
    } else {
      // Employee: self + department members (or self)
      users = await User.find({
        $or: [{ _id: req.user._id }, { department: req.user.department }],
        isActive: true,
      })
        .select("_id name email department role")
        .lean();
    }

    const userIds = users.map((u) => u._id);

    // 3. Find all pending and approved requests overlapping this month
    const requests = await LeaveRequest.find({
      userId: { $in: userIds },
      status: { $in: ["approved", "pending"] },
      startDate: { $lte: endOfMonth },
      endDate: { $gte: startOfMonth },
    })
      .populate("leaveTypeId", "name color isPaid")
      .lean();

    // 4. Organize per user
    const team = users.map((user) => {
      const userRequests = requests.filter(
        (r) => r.userId.toString() === user._id.toString()
      );
      return {
        user,
        requests: userRequests,
      };
    });

    const formattedMonth = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

    return res.status(200).json({
      month: formattedMonth,
      year,
      daysInMonth,
      holidays,
      team,
    });
  } catch (err) {
    next(err);
  }
};

import { LeaveRequest } from "../models/LeaveRequest.js";
import { User } from "../models/User.js";

export const getManagerRequests = async (req, res, next) => {
  try {
    let targetUserIds = [];

    if (req.user.role === "admin") {
      // Admin sees requests from everyone (excluding themselves if needed, or all)
      const allUsers = await User.find({}).select("_id");
      targetUserIds = allUsers.map((u) => u._id);
    } else {
      // Manager sees requests from direct reports only
      const directReports = await User.find({ managerId: req.user._id }).select("_id");
      targetUserIds = directReports.map((u) => u._id);
    }

    const { status } = req.query;
    const filter = { userId: { $in: targetUserIds } };
    if (status) {
      filter.status = status;
    }

    const requests = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email department role")
      .populate("leaveTypeId", "name color isPaid yearlyAllowance")
      .populate("decidedBy", "name email");

    return res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
};

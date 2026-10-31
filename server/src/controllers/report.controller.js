import { LeaveRequest } from "../models/LeaveRequest.js";
import { User } from "../models/User.js";

export const getReportsSummary = async (req, res, next) => {
  try {
    const { year, department } = req.query;
    const currentYear = year ? parseInt(year, 10) : new Date().getUTCFullYear();

    const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    const matchQuery = {
      createdAt: { $gte: startOfYear, $lte: endOfYear },
    };

    if (department) {
      const deptUsers = await User.find({ department }).select("_id");
      matchQuery.userId = { $in: deptUsers.map((u) => u._id) };
    }

    // 1. Total counts by status
    const statusCounts = await LeaveRequest.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$status", count: { $sum: 1 }, totalDays: { $sum: "$days" } } },
    ]);

    const statusSummary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      total: 0,
      approvedDays: 0,
    };

    statusCounts.forEach((sc) => {
      if (statusSummary[sc._id] !== undefined) {
        statusSummary[sc._id] = sc.count;
      }
      statusSummary.total += sc.count;
      if (sc._id === "approved") {
        statusSummary.approvedDays = sc.totalDays;
      }
    });

    // 2. Breakdown by Leave Type (for approved requests)
    const leaveTypeBreakdown = await LeaveRequest.aggregate([
      { $match: { ...matchQuery, status: "approved" } },
      {
        $group: {
          _id: "$leaveTypeId",
          count: { $sum: 1 },
          days: { $sum: "$days" },
        },
      },
      {
        $lookup: {
          from: "leavetypes",
          localField: "_id",
          foreignField: "_id",
          as: "leaveType",
        },
      },
      { $unwind: "$leaveType" },
      {
        $project: {
          _id: 1,
          name: "$leaveType.name",
          color: "$leaveType.color",
          count: 1,
          days: 1,
        },
      },
    ]);

    // 3. Breakdown by Department
    const departmentBreakdown = await LeaveRequest.aggregate([
      { $match: { ...matchQuery, status: "approved" } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$user.department",
          department: { $first: "$user.department" },
          count: { $sum: 1 },
          days: { $sum: "$days" },
        },
      },
    ]);

    return res.status(200).json({
      year: currentYear,
      statusSummary,
      leaveTypeBreakdown,
      departmentBreakdown,
    });
  } catch (err) {
    next(err);
  }
};

export const exportReportsCsv = async (req, res, next) => {
  try {
    const { year, department, status } = req.query;
    const filter = {};

    if (year) {
      const y = parseInt(year, 10);
      const startOfYear = new Date(Date.UTC(y, 0, 1));
      const endOfYear = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      filter.createdAt = { $gte: startOfYear, $lte: endOfYear };
    }

    if (status) {
      filter.status = status;
    }

    if (department) {
      const deptUsers = await User.find({ department }).select("_id");
      filter.userId = { $in: deptUsers.map((u) => u._id) };
    }

    const requests = await LeaveRequest.find(filter)
      .populate("userId", "name email department")
      .populate("leaveTypeId", "name")
      .populate("decidedBy", "name")
      .sort({ createdAt: -1 });

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      "Request ID",
      "Employee",
      "Email",
      "Department",
      "Leave Type",
      "Start Date",
      "End Date",
      "Half Day",
      "Days",
      "Status",
      "Reason",
      "Decided By",
      "Decision Comment",
      "Created At",
    ];

    const rows = requests.map((r) => [
      escapeCsv(r._id),
      escapeCsv(r.userId?.name || "N/A"),
      escapeCsv(r.userId?.email || "N/A"),
      escapeCsv(r.userId?.department || "N/A"),
      escapeCsv(r.leaveTypeId?.name || "N/A"),
      escapeCsv(r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : ""),
      escapeCsv(r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : ""),
      escapeCsv(r.halfDay || "none"),
      escapeCsv(r.days),
      escapeCsv(r.status),
      escapeCsv(r.reason),
      escapeCsv(r.decidedBy?.name || ""),
      escapeCsv(r.decisionComment || ""),
      escapeCsv(r.createdAt ? new Date(r.createdAt).toISOString() : ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leave-requests-export-${Date.now()}.csv"`
    );

    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

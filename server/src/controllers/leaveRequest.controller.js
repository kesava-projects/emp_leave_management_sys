import { LeaveRequest } from "../models/LeaveRequest.js";
import {
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
} from "../services/leaveRequest.service.js";
import { calculateWorkingDays, getHolidaysInRange } from "../services/workingDays.service.js";

export const getMyRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("leaveTypeId", "name color isPaid yearlyAllowance")
      .populate("decidedBy", "name email");

    return res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
};

export const createRequest = async (req, res, next) => {
  try {
    const { leaveTypeId, startDate, endDate, halfDay, reason } = req.body;

    const request = await createLeaveRequest({
      userId: req.user._id,
      leaveTypeId,
      startDate,
      endDate,
      halfDay,
      reason,
      actorRole: req.user.role,
    });

    return res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
};

export const calculateDaysPreview = async (req, res, next) => {
  try {
    const { startDate, endDate, halfDay } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: { code: "INVALID_DATE", message: "Start date and end date are required" },
      });
    }

    const holidays = await getHolidaysInRange(startDate, endDate);
    const days = calculateWorkingDays(startDate, endDate, halfDay || "none", holidays);

    return res.status(200).json({ days });
  } catch (err) {
    next(err);
  }
};

export const cancelRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body || {};

    const updated = await cancelLeaveRequest(id, req.user, comment);
    return res.status(200).json({ request: updated });
  } catch (err) {
    next(err);
  }
};

export const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body || {};

    const updated = await approveLeaveRequest(id, req.user, comment);
    return res.status(200).json({ request: updated });
  } catch (err) {
    next(err);
  }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const updated = await rejectLeaveRequest(id, req.user, comment);
    return res.status(200).json({ request: updated });
  } catch (err) {
    next(err);
  }
};

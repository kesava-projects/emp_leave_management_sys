import { LeaveRequest } from "../models/LeaveRequest.js";
import { LeaveType } from "../models/LeaveType.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import {
  calculateWorkingDays,
  getHolidaysInRange,
} from "./workingDays.service.js";
import {
  reservePendingBalance,
  releasePendingBalance,
  approvePendingBalance,
  restoreApprovedBalance,
} from "./balance.service.js";

/**
 * Check if the requested date range overlaps with any pending or approved requests
 */
export const checkOverlap = async (userId, startDate, endDate, halfDay = "none", excludeRequestId = null) => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const query = {
    userId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  };

  if (excludeRequestId) {
    query._id = { $ne: excludeRequestId };
  }

  const overlappingRequests = await LeaveRequest.find(query);

  if (overlappingRequests.length === 0) {
    return false;
  }

  // Check special case: exact same single day with different half-day slots
  if (halfDay !== "none" && overlappingRequests.length === 1) {
    const existing = overlappingRequests[0];
    const sameDay =
      existing.startDate.toISOString().slice(0, 10) === start.toISOString().slice(0, 10) &&
      existing.endDate.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);

    if (
      sameDay &&
      existing.halfDay !== "none" &&
      existing.halfDay !== halfDay
    ) {
      // First half + second half on the same day can coexist!
      return false;
    }
  }

  return true;
};

/**
 * Apply for leave
 */
export const createLeaveRequest = async ({
  userId,
  leaveTypeId,
  startDate,
  endDate,
  halfDay = "none",
  reason,
  actorRole = "employee",
}) => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const err = new Error("Invalid start or end date");
    err.code = "INVALID_DATE";
    throw err;
  }

  if (end < start) {
    const err = new Error("End date cannot be before start date");
    err.code = "INVALID_DATE_RANGE";
    throw err;
  }

  // Reject start date in past unless admin override
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (start < today && actorRole !== "admin") {
    const err = new Error("Start date cannot be in the past");
    err.code = "PAST_DATE_NOT_ALLOWED";
    throw err;
  }

  // Check leave type
  const leaveType = await LeaveType.findById(leaveTypeId);
  if (!leaveType) {
    const err = new Error("Leave type not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Exclude public holidays and weekends
  const holidays = await getHolidaysInRange(start, end);
  const days = calculateWorkingDays(start, end, halfDay, holidays);

  if (days <= 0) {
    const err = new Error("Selected date range contains no working days");
    err.code = "NO_WORKING_DAYS";
    throw err;
  }

  // Overlap check
  const hasOverlap = await checkOverlap(userId, start, end, halfDay);
  if (hasOverlap) {
    const err = new Error("Leave request overlaps with an existing pending or approved request");
    err.code = "OVERLAPPING_REQUEST";
    throw err;
  }

  const year = start.getUTCFullYear();

  // Reserve balance (atomic check and reserve)
  await reservePendingBalance(userId, leaveTypeId, year, days);

  try {
    const leaveRequest = await LeaveRequest.create({
      userId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      halfDay,
      days,
      reason,
      status: "pending",
    });

    // Create Audit Log
    await AuditLog.create({
      requestId: leaveRequest._id,
      actorId: userId,
      action: "created",
      comment: `Requested ${days} day(s) of ${leaveType.name} leave`,
    });

    return await LeaveRequest.findById(leaveRequest._id)
      .populate("leaveTypeId", "name color isPaid yearlyAllowance")
      .populate("userId", "name email department");
  } catch (creationError) {
    // If request creation fails, release reserved balance
    await releasePendingBalance(userId, leaveTypeId, year, days);
    throw creationError;
  }
};

/**
 * Approve a leave request
 */
export const approveLeaveRequest = async (requestId, actorUser, comment = "") => {
  const request = await LeaveRequest.findById(requestId).populate("leaveTypeId");
  if (!request) {
    const err = new Error("Leave request not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (request.status !== "pending") {
    const err = new Error(`Cannot approve a request with status '${request.status}'`);
    err.code = "INVALID_STATUS";
    throw err;
  }

  // Rule: Manager cannot approve their own request
  if (request.userId.toString() === actorUser._id.toString()) {
    const err = new Error("A manager cannot approve their own leave request");
    err.code = "SELF_APPROVAL_NOT_ALLOWED";
    throw err;
  }

  // Check permissions: manager can only approve their direct reports
  if (actorUser.role === "manager") {
    const targetUser = await User.findById(request.userId);
    if (!targetUser || !targetUser.managerId || targetUser.managerId.toString() !== actorUser._id.toString()) {
      const err = new Error("Managers can only approve requests from their direct reports");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  const year = new Date(request.startDate).getUTCFullYear();

  // Atomic update to transition pending balance to used
  await approvePendingBalance(request.userId, request.leaveTypeId._id, year, request.days);

  request.status = "approved";
  request.decidedBy = actorUser._id;
  request.decisionComment = comment || "Approved";
  await request.save();

  // Audit log
  await AuditLog.create({
    requestId: request._id,
    actorId: actorUser._id,
    action: "approved",
    comment: comment || "Approved",
  });

  return await LeaveRequest.findById(request._id)
    .populate("leaveTypeId", "name color isPaid")
    .populate("userId", "name email department")
    .populate("decidedBy", "name email");
};

/**
 * Reject a leave request
 */
export const rejectLeaveRequest = async (requestId, actorUser, comment) => {
  if (!comment || !comment.trim()) {
    const err = new Error("Rejection requires a comment");
    err.code = "COMMENT_REQUIRED";
    throw err;
  }

  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    const err = new Error("Leave request not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (request.status !== "pending") {
    const err = new Error(`Cannot reject a request with status '${request.status}'`);
    err.code = "INVALID_STATUS";
    throw err;
  }

  if (request.userId.toString() === actorUser._id.toString()) {
    const err = new Error("A manager cannot reject their own leave request");
    err.code = "SELF_ACTION_NOT_ALLOWED";
    throw err;
  }

  if (actorUser.role === "manager") {
    const targetUser = await User.findById(request.userId);
    if (!targetUser || !targetUser.managerId || targetUser.managerId.toString() !== actorUser._id.toString()) {
      const err = new Error("Managers can only reject requests from their direct reports");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  const year = new Date(request.startDate).getUTCFullYear();

  // Release pending balance
  await releasePendingBalance(request.userId, request.leaveTypeId, year, request.days);

  request.status = "rejected";
  request.decidedBy = actorUser._id;
  request.decisionComment = comment.trim();
  await request.save();

  // Audit log
  await AuditLog.create({
    requestId: request._id,
    actorId: actorUser._id,
    action: "rejected",
    comment: comment.trim(),
  });

  return await LeaveRequest.findById(request._id)
    .populate("leaveTypeId", "name color isPaid")
    .populate("userId", "name email department")
    .populate("decidedBy", "name email");
};

/**
 * Cancel a leave request
 * - Employee can cancel pending requests only
 * - Admin can cancel approved or pending requests (restoring used/pending balance)
 */
export const cancelLeaveRequest = async (requestId, actorUser, comment = "") => {
  const request = await LeaveRequest.findById(requestId);
  if (!request) {
    const err = new Error("Leave request not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const isOwner = request.userId.toString() === actorUser._id.toString();
  const isAdmin = actorUser.role === "admin";

  if (!isOwner && !isAdmin) {
    const err = new Error("You do not have permission to cancel this leave request");
    err.code = "FORBIDDEN";
    throw err;
  }

  // Employee can only cancel pending requests
  if (isOwner && !isAdmin) {
    if (request.status !== "pending") {
      const err = new Error("Employees can only cancel pending leave requests");
      err.code = "CANNOT_CANCEL_NON_PENDING";
      throw err;
    }
  }

  // Admin can cancel pending or approved requests
  if (isAdmin && !["pending", "approved"].includes(request.status)) {
    const err = new Error(`Cannot cancel a request that is already '${request.status}'`);
    err.code = "INVALID_STATUS";
    throw err;
  }

  const year = new Date(request.startDate).getUTCFullYear();

  if (request.status === "pending") {
    // Release pending balance
    await releasePendingBalance(request.userId, request.leaveTypeId, year, request.days);
  } else if (request.status === "approved") {
    // Restore used balance
    await restoreApprovedBalance(request.userId, request.leaveTypeId, year, request.days);
  }

  const oldStatus = request.status;
  request.status = "cancelled";
  request.decisionComment = comment || (isAdmin ? "Cancelled by Admin" : "Cancelled by Employee");
  await request.save();

  // Audit log
  await AuditLog.create({
    requestId: request._id,
    actorId: actorUser._id,
    action: "cancelled",
    comment: comment || `Cancelled from ${oldStatus}`,
  });

  return await LeaveRequest.findById(request._id)
    .populate("leaveTypeId", "name color isPaid")
    .populate("userId", "name email department");
};

import { LeaveBalance } from "../models/LeaveBalance.js";
import { LeaveType } from "../models/LeaveType.js";

/**
 * Get remaining balance for a given balance record and leave type
 */
export const calculateRemaining = (balance, leaveType) => {
  if (leaveType && !leaveType.isPaid) {
    return Infinity;
  }
  const allocated = balance.allocated || 0;
  const carriedOver = balance.carriedOver || 0;
  const used = balance.used || 0;
  const pending = balance.pending || 0;

  return allocated + carriedOver - used - pending;
};

/**
 * Get or create balance record for a user, leave type, and year
 */
export const getOrCreateBalance = async (userId, leaveTypeId, year, session = null) => {
  let query = LeaveBalance.findOne({ userId, leaveTypeId, year });
  if (session) query = query.session(session);

  let balance = await query;
  if (!balance) {
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      throw new Error("Leave type not found");
    }

    const allocated = leaveType.isPaid ? leaveType.yearlyAllowance : 0;
    const newDoc = new LeaveBalance({
      userId,
      leaveTypeId,
      year,
      allocated,
      carriedOver: 0,
      used: 0,
      pending: 0,
    });

    if (session) {
      balance = await newDoc.save({ session });
    } else {
      balance = await newDoc.save();
    }
  }

  return balance;
};

/**
 * Get all balances for a user for a specified year, ensuring all active leave types exist
 */
export const getUserBalances = async (userId, year) => {
  const allLeaveTypes = await LeaveType.find().lean();
  const balances = [];

  for (const lt of allLeaveTypes) {
    let bal = await LeaveBalance.findOne({
      userId,
      leaveTypeId: lt._id,
      year,
    }).populate("leaveTypeId");

    if (!bal) {
      const allocated = lt.isPaid ? lt.yearlyAllowance : 0;
      bal = await LeaveBalance.create({
        userId,
        leaveTypeId: lt._id,
        year,
        allocated,
        carriedOver: 0,
        used: 0,
        pending: 0,
      });
      bal = await LeaveBalance.findById(bal._id).populate("leaveTypeId");
    }

    const remaining = calculateRemaining(bal, lt);
    balances.push({
      ...bal.toObject(),
      remaining: remaining === Infinity ? null : remaining,
      isUnlimited: !lt.isPaid,
    });
  }

  return balances;
};

/**
 * Atomically reserve pending balance when a request is submitted
 */
export const reservePendingBalance = async (userId, leaveTypeId, year, days) => {
  const leaveType = await LeaveType.findById(leaveTypeId);
  if (!leaveType) {
    throw new Error("Leave type not found");
  }

  // Ensure balance record exists
  const balance = await getOrCreateBalance(userId, leaveTypeId, year);

  if (leaveType.isPaid) {
    const remaining = calculateRemaining(balance, leaveType);
    if (remaining < days) {
      const err = new Error(
        `Insufficient leave balance. Requested ${days} days, but only ${remaining} days available (including pending).`
      );
      err.code = "INSUFFICIENT_BALANCE";
      throw err;
    }

    // Atomic increment of pending with verification
    const updated = await LeaveBalance.findOneAndUpdate(
      {
        _id: balance._id,
        $expr: {
          $gte: [
            { $subtract: [{ $add: ["$allocated", "$carriedOver"] }, { $add: ["$used", "$pending"] }] },
            days,
          ],
        },
      },
      { $inc: { pending: days } },
      { new: true }
    );

    if (!updated) {
      const err = new Error("Balance changed concurrently. Insufficient remaining balance.");
      err.code = "INSUFFICIENT_BALANCE";
      throw err;
    }

    return updated;
  } else {
    // Unpaid leave - still track pending days
    return await LeaveBalance.findByIdAndUpdate(
      balance._id,
      { $inc: { pending: days } },
      { new: true }
    );
  }
};

/**
 * Release pending balance when a request is rejected or cancelled
 */
export const releasePendingBalance = async (userId, leaveTypeId, year, days) => {
  return await LeaveBalance.findOneAndUpdate(
    { userId, leaveTypeId, year, pending: { $gte: days } },
    { $inc: { pending: -days } },
    { new: true }
  );
};

/**
 * Atomically transition balance from pending to used upon approval
 */
export const approvePendingBalance = async (userId, leaveTypeId, year, days) => {
  const leaveType = await LeaveType.findById(leaveTypeId);
  if (!leaveType) {
    throw new Error("Leave type not found");
  }

  if (leaveType.isPaid) {
    // Atomic check: must have pending >= days
    // and total used + days must not exceed allocated + carriedOver + pending
    const updated = await LeaveBalance.findOneAndUpdate(
      {
        userId,
        leaveTypeId,
        year,
        pending: { $gte: days },
      },
      {
        $inc: { pending: -days, used: days },
      },
      { new: true }
    );

    if (!updated) {
      const err = new Error(
        "Cannot approve request: balance record mismatch or pending days unavailable"
      );
      err.code = "BALANCE_CONCURRENCY_ERROR";
      throw err;
    }

    return updated;
  } else {
    // Unpaid leave
    return await LeaveBalance.findOneAndUpdate(
      { userId, leaveTypeId, year },
      { $inc: { pending: -days, used: days } },
      { new: true }
    );
  }
};

/**
 * Restore balance when an approved request is cancelled (by Admin)
 */
export const restoreApprovedBalance = async (userId, leaveTypeId, year, days) => {
  return await LeaveBalance.findOneAndUpdate(
    { userId, leaveTypeId, year, used: { $gte: days } },
    { $inc: { used: -days } },
    { new: true }
  );
};

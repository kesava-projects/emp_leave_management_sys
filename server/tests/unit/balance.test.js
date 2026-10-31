import { User } from "../../src/models/User.js";
import { LeaveType } from "../../src/models/LeaveType.js";
import { LeaveBalance } from "../../src/models/LeaveBalance.js";
import {
  calculateRemaining,
  getOrCreateBalance,
  reservePendingBalance,
  releasePendingBalance,
  approvePendingBalance,
  restoreApprovedBalance,
} from "../../src/services/balance.service.js";

describe("balance.service - balance rules", () => {
  let user;
  let annualLeaveType;
  let unpaidLeaveType;
  const currentYear = 2026;

  beforeEach(async () => {
    user = await User.create({
      name: "Balance Tester",
      email: "balance.test@company.com",
      passwordHash: "hash",
      role: "employee",
      department: "Finance",
    });

    annualLeaveType = await LeaveType.create({
      name: "Annual Leave",
      yearlyAllowance: 20,
      carryOverLimit: 5,
      isPaid: true,
    });

    unpaidLeaveType = await LeaveType.create({
      name: "Unpaid Leave",
      yearlyAllowance: 0,
      isPaid: false,
    });
  });

  it("calculates remaining balance as allocated + carriedOver - used - pending", () => {
    const balance = {
      allocated: 20,
      carriedOver: 3,
      used: 5,
      pending: 2,
    };
    const remaining = calculateRemaining(balance, annualLeaveType);
    expect(remaining).toBe(16); // 20 + 3 - 5 - 2
  });

  it("returns Infinity for unpaid leave types", () => {
    const balance = { allocated: 0, carriedOver: 0, used: 10, pending: 5 };
    const remaining = calculateRemaining(balance, unpaidLeaveType);
    expect(remaining).toBe(Infinity);
  });

  it("initializes balance correctly with getOrCreateBalance", async () => {
    const balance = await getOrCreateBalance(user._id, annualLeaveType._id, currentYear);
    expect(balance.allocated).toBe(20);
    expect(balance.used).toBe(0);
    expect(balance.pending).toBe(0);
  });

  it("reserves pending balance and prevents overdraw", async () => {
    // Initial balance is 20
    const b1 = await reservePendingBalance(user._id, annualLeaveType._id, currentYear, 5);
    expect(b1.pending).toBe(5);

    // Reserve 14 more (remaining is 15 -> after 14, 1 left)
    const b2 = await reservePendingBalance(user._id, annualLeaveType._id, currentYear, 14);
    expect(b2.pending).toBe(19);

    // Try to reserve 2 more days when only 1 is left -> should fail
    await expect(
      reservePendingBalance(user._id, annualLeaveType._id, currentYear, 2)
    ).rejects.toThrow("Insufficient leave balance");
  });

  it("releases pending balance properly", async () => {
    await reservePendingBalance(user._id, annualLeaveType._id, currentYear, 5);
    const updated = await releasePendingBalance(user._id, annualLeaveType._id, currentYear, 5);
    expect(updated.pending).toBe(0);
  });

  it("atomically approves pending balance moving from pending to used", async () => {
    await reservePendingBalance(user._id, annualLeaveType._id, currentYear, 4);

    const approved = await approvePendingBalance(user._id, annualLeaveType._id, currentYear, 4);
    expect(approved.pending).toBe(0);
    expect(approved.used).toBe(4);
  });

  it("fails approval if pending days are less than approved days (prevents double approval)", async () => {
    await reservePendingBalance(user._id, annualLeaveType._id, currentYear, 3);

    // First approval succeeds
    await approvePendingBalance(user._id, annualLeaveType._id, currentYear, 3);

    // Second approval of the same 3 days fails because pending is now 0
    await expect(
      approvePendingBalance(user._id, annualLeaveType._id, currentYear, 3)
    ).rejects.toThrow("Cannot approve request");
  });

  it("restores balance when approved leave is cancelled", async () => {
    // Setup balance with used: 4
    await LeaveBalance.create({
      userId: user._id,
      leaveTypeId: annualLeaveType._id,
      year: currentYear,
      allocated: 20,
      used: 4,
      pending: 0,
    });

    const restored = await restoreApprovedBalance(user._id, annualLeaveType._id, currentYear, 4);
    expect(restored.used).toBe(0);
  });
});

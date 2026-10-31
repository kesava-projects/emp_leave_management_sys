import { LeaveRequest } from "../../src/models/LeaveRequest.js";
import { LeaveType } from "../../src/models/LeaveType.js";
import { User } from "../../src/models/User.js";
import { checkOverlap } from "../../src/services/leaveRequest.service.js";

describe("leaveRequest.service - checkOverlap", () => {
  let userId;
  let leaveTypeId;

  beforeEach(async () => {
    const user = await User.create({
      name: "Test User",
      email: "test.overlap@company.com",
      passwordHash: "hash123",
      role: "employee",
      department: "Engineering",
    });
    userId = user._id;

    const lt = await LeaveType.create({
      name: "Annual Leave",
      yearlyAllowance: 20,
    });
    leaveTypeId = lt._id;
  });

  it("returns false when user has no requests", async () => {
    const overlaps = await checkOverlap(
      userId,
      new Date("2026-11-10"),
      new Date("2026-11-12")
    );
    expect(overlaps).toBe(false);
  });

  it("returns true for exact matching dates of pending request", async () => {
    await LeaveRequest.create({
      userId,
      leaveTypeId,
      startDate: new Date("2026-11-10T00:00:00.000Z"),
      endDate: new Date("2026-11-12T00:00:00.000Z"),
      days: 3,
      reason: "Vacation",
      status: "pending",
    });

    const overlaps = await checkOverlap(
      userId,
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-12T00:00:00.000Z")
    );
    expect(overlaps).toBe(true);
  });

  it("returns true for partial overlap of approved request", async () => {
    await LeaveRequest.create({
      userId,
      leaveTypeId,
      startDate: new Date("2026-11-10T00:00:00.000Z"),
      endDate: new Date("2026-11-15T00:00:00.000Z"),
      days: 4,
      reason: "Vacation",
      status: "approved",
    });

    // Start before, ends during
    const overlapBefore = await checkOverlap(
      userId,
      new Date("2026-11-08T00:00:00.000Z"),
      new Date("2026-11-11T00:00:00.000Z")
    );
    expect(overlapBefore).toBe(true);

    // Starts during, ends after
    const overlapAfter = await checkOverlap(
      userId,
      new Date("2026-11-14T00:00:00.000Z"),
      new Date("2026-11-18T00:00:00.000Z")
    );
    expect(overlapAfter).toBe(true);
  });

  it("ignores cancelled and rejected requests", async () => {
    await LeaveRequest.create({
      userId,
      leaveTypeId,
      startDate: new Date("2026-11-10T00:00:00.000Z"),
      endDate: new Date("2026-11-12T00:00:00.000Z"),
      days: 3,
      reason: "Rejected request",
      status: "rejected",
      decisionComment: "Not allowed",
    });

    await LeaveRequest.create({
      userId,
      leaveTypeId,
      startDate: new Date("2026-11-15T00:00:00.000Z"),
      endDate: new Date("2026-11-16T00:00:00.000Z"),
      days: 2,
      reason: "Cancelled request",
      status: "cancelled",
    });

    const overlap1 = await checkOverlap(
      userId,
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-12T00:00:00.000Z")
    );
    expect(overlap1).toBe(false);

    const overlap2 = await checkOverlap(
      userId,
      new Date("2026-11-15T00:00:00.000Z"),
      new Date("2026-11-16T00:00:00.000Z")
    );
    expect(overlap2).toBe(false);
  });

  it("allows non-overlapping first half and second half on the same day", async () => {
    await LeaveRequest.create({
      userId,
      leaveTypeId,
      startDate: new Date("2026-11-10T00:00:00.000Z"),
      endDate: new Date("2026-11-10T00:00:00.000Z"),
      halfDay: "first",
      days: 0.5,
      reason: "Morning doctor",
      status: "approved",
    });

    const overlapsSecondHalf = await checkOverlap(
      userId,
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-10T00:00:00.000Z"),
      "second"
    );
    expect(overlapsSecondHalf).toBe(false);

    // But another 'first' half on the same day overlaps
    const overlapsFirstHalf = await checkOverlap(
      userId,
      new Date("2026-11-10T00:00:00.000Z"),
      new Date("2026-11-10T00:00:00.000Z"),
      "first"
    );
    expect(overlapsFirstHalf).toBe(true);
  });
});

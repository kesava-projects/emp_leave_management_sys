import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { LeaveType } from "../../src/models/LeaveType.js";
import { LeaveBalance } from "../../src/models/LeaveBalance.js";

describe("Integration: Leave Request Lifecycle & Permissions", () => {
  let manager1, manager2, emp1;
  let adminToken, manager1Token, manager2Token, emp1Token, emp2Token;
  let annualLeave;
  const currentYear = new Date().getUTCFullYear();

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    await User.create({
      name: "Alice Admin",
      email: "admin@test.com",
      passwordHash,
      role: "admin",
      department: "HR",
    });

    manager1 = await User.create({
      name: "Bob Manager",
      email: "bob@test.com",
      passwordHash,
      role: "manager",
      department: "Engineering",
    });

    manager2 = await User.create({
      name: "Carol Manager",
      email: "carol@test.com",
      passwordHash,
      role: "manager",
      department: "Marketing",
    });

    emp1 = await User.create({
      name: "David Dev",
      email: "david@test.com",
      passwordHash,
      role: "employee",
      department: "Engineering",
      managerId: manager1._id,
    });

    await User.create({
      name: "Emma Engineer",
      email: "emma@test.com",
      passwordHash,
      role: "employee",
      department: "Marketing",
      managerId: manager2._id,
    });

    annualLeave = await LeaveType.create({
      name: "Annual Leave",
      yearlyAllowance: 10,
      isPaid: true,
      requiresApproval: true,
    });

    // Initialize balance for emp1
    await LeaveBalance.create({
      userId: emp1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
      allocated: 10,
      used: 0,
      pending: 0,
      carriedOver: 0,
    });

    // Login each to get tokens
    const getToken = async (email) => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "Password123!" });
      return res.body.token;
    };

    adminToken = await getToken("admin@test.com");
    manager1Token = await getToken("bob@test.com");
    manager2Token = await getToken("carol@test.com");
    emp1Token = await getToken("david@test.com");
    emp2Token = await getToken("emma@test.com");
  });

  it("POST /api/requests: employee can apply for leave and pending balance increments", async () => {
    // Nov 10, 2026 is Tuesday, Nov 12 is Thursday = 3 days
    const res = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "Holiday trip",
      });

    expect(res.status).toBe(201);
    expect(res.body.request).toBeDefined();
    expect(res.body.request.days).toBe(3);
    expect(res.body.request.status).toBe("pending");

    // Check balance
    const balance = await LeaveBalance.findOne({
      userId: emp1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
    });
    expect(balance.pending).toBe(3);
  });

  it("POST /api/requests: fails if requesting more days than balance", async () => {
    // 10 days allocated. Requesting 11 days.
    // Nov 2 to Nov 16 is 11 working days (M-F Nov 2-6 = 5, Nov 9-13 = 5, Nov 16 = 1)
    const res = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-02",
        endDate: "2026-11-16",
        reason: "Extended vacation",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("POST /api/requests: fails if request overlaps existing pending leave", async () => {
    // First request
    await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "First trip",
      });

    // Overlapping request
    const res = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-11",
        endDate: "2026-11-13",
        reason: "Overlap trip",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("OVERLAPPING_REQUEST");
  });

  it("PATCH /api/requests/:id/cancel: employee can cancel own pending request and restore pending balance", async () => {
    const createRes = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "Will cancel",
      });

    const requestId = createRes.body.request._id;

    const cancelRes = await request(app)
      .patch(`/api/requests/${requestId}/cancel`)
      .set("Cookie", [`token=${emp1Token}`])
      .send({ comment: "No longer needed" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.request.status).toBe("cancelled");

    const balance = await LeaveBalance.findOne({
      userId: emp1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
    });
    expect(balance.pending).toBe(0);
  });

  it("PATCH /api/requests/:id/cancel: another employee cannot cancel someone else's request", async () => {
    const createRes = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "David's leave",
      });

    const requestId = createRes.body.request._id;

    const cancelRes = await request(app)
      .patch(`/api/requests/${requestId}/cancel`)
      .set("Cookie", [`token=${emp2Token}`])
      .send({});

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.error.code).toBe("FORBIDDEN");
  });

  it("PATCH /api/requests/:id/approve: manager can approve direct report's leave", async () => {
    const createRes = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "David's leave",
      });

    const requestId = createRes.body.request._id;

    const approveRes = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set("Cookie", [`token=${manager1Token}`])
      .send({ comment: "Approved by manager Bob" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.request.status).toBe("approved");

    // Balance check: pending 0, used 3
    const balance = await LeaveBalance.findOne({
      userId: emp1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
    });
    expect(balance.pending).toBe(0);
    expect(balance.used).toBe(3);
  });

  it("PATCH /api/requests/:id/approve: manager cannot approve a non-direct report's leave", async () => {
    // Emp1 is under manager1, manager2 tries to approve
    const createRes = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "David's leave",
      });

    const requestId = createRes.body.request._id;

    const approveRes = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set("Cookie", [`token=${manager2Token}`])
      .send({ comment: "Illegal approval" });

    expect(approveRes.status).toBe(403);
    expect(approveRes.body.error.code).toBe("FORBIDDEN");
  });

  it("PATCH /api/requests/:id/approve: manager cannot approve their own request", async () => {
    // Initialize balance for manager1
    await LeaveBalance.create({
      userId: manager1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
      allocated: 10,
      used: 0,
      pending: 0,
      carriedOver: 0,
    });

    const createRes = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${manager1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-17",
        endDate: "2026-11-18",
        reason: "Manager's leave",
      });

    const requestId = createRes.body.request._id;

    // Manager1 attempts to approve their own request
    const approveRes = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set("Cookie", [`token=${manager1Token}`])
      .send({ comment: "Self-approval" });

    expect(approveRes.status).toBe(400);
    expect(approveRes.body.error.code).toBe("SELF_APPROVAL_NOT_ALLOWED");

    // But Admin CAN approve the manager's request!
    const adminApproveRes = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set("Cookie", [`token=${adminToken}`])
      .send({ comment: "Approved by Admin" });

    expect(adminApproveRes.status).toBe(200);
    expect(adminApproveRes.body.request.status).toBe("approved");
  });

  it("PATCH /api/requests/:id/reject: requires a comment and releases balance", async () => {
    const createRes = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "David's leave",
      });

    const requestId = createRes.body.request._id;

    // Reject without comment should fail
    const failRes = await request(app)
      .patch(`/api/requests/${requestId}/reject`)
      .set("Cookie", [`token=${manager1Token}`])
      .send({ comment: "" });

    expect(failRes.status).toBe(400);

    // Reject with comment succeeds
    const successRes = await request(app)
      .patch(`/api/requests/${requestId}/reject`)
      .set("Cookie", [`token=${manager1Token}`])
      .send({ comment: "Team is short on capacity" });

    expect(successRes.status).toBe(200);
    expect(successRes.body.request.status).toBe("rejected");
    expect(successRes.body.request.decisionComment).toBe("Team is short on capacity");

    const balance = await LeaveBalance.findOne({
      userId: emp1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
    });
    expect(balance.pending).toBe(0);
  });

  it("PATCH /api/requests/:id/cancel: Admin can cancel approved leave, restoring balance", async () => {
    const createRes = await request(app)
      .post("/api/requests")
      .set("Cookie", [`token=${emp1Token}`])
      .send({
        leaveTypeId: annualLeave._id.toString(),
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "David's leave",
      });

    const requestId = createRes.body.request._id;

    // Manager approves it
    await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set("Cookie", [`token=${manager1Token}`])
      .send({ comment: "Approved" });

    // Verify used is 3
    let balance = await LeaveBalance.findOne({
      userId: emp1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
    });
    expect(balance.used).toBe(3);

    // Employee cannot cancel approved leave
    const empCancel = await request(app)
      .patch(`/api/requests/${requestId}/cancel`)
      .set("Cookie", [`token=${emp1Token}`])
      .send({});
    expect(empCancel.status).toBe(400);
    expect(empCancel.body.error.code).toBe("CANNOT_CANCEL_NON_PENDING");

    // Admin cancels approved leave
    const adminCancel = await request(app)
      .patch(`/api/requests/${requestId}/cancel`)
      .set("Cookie", [`token=${adminToken}`])
      .send({ comment: "Cancelled by Admin due to emergency project" });

    expect(adminCancel.status).toBe(200);
    expect(adminCancel.body.request.status).toBe("cancelled");

    // Balance used is restored back to 0!
    balance = await LeaveBalance.findOne({
      userId: emp1._id,
      leaveTypeId: annualLeave._id,
      year: currentYear,
    });
    expect(balance.used).toBe(0);
  });
});

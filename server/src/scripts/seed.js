import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { LeaveType } from "../models/LeaveType.js";
import { LeaveBalance } from "../models/LeaveBalance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";
import { Holiday } from "../models/Holiday.js";
import { AuditLog } from "../models/AuditLog.js";

export const seedDatabase = async () => {
  console.log("Starting database seed...");

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    LeaveType.deleteMany({}),
    LeaveBalance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Holiday.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  console.log("Cleared collections.");

  // 1. Create Leave Types
  const leaveTypes = await LeaveType.create([
    {
      name: "Annual Leave",
      yearlyAllowance: 20,
      carryOverLimit: 5,
      color: "#2563eb", // blue
      requiresApproval: true,
      isPaid: true,
    },
    {
      name: "Sick Leave",
      yearlyAllowance: 10,
      carryOverLimit: 0,
      color: "#dc2626", // red
      requiresApproval: true,
      isPaid: true,
    },
    {
      name: "Casual Leave",
      yearlyAllowance: 6,
      carryOverLimit: 2,
      color: "#059669", // green
      requiresApproval: true,
      isPaid: true,
    },
    {
      name: "Unpaid Leave",
      yearlyAllowance: 0,
      carryOverLimit: 0,
      color: "#7c3aed", // purple
      requiresApproval: true,
      isPaid: false,
    },
  ]);

  const leaveTypeMap = {};
  leaveTypes.forEach((lt) => {
    leaveTypeMap[lt.name] = lt;
  });

  // 2. Create Users
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Admin
  const admin = await User.create({
    name: "Alice Admin",
    email: "admin@company.com",
    passwordHash,
    role: "admin",
    department: "Human Resources",
    managerId: null,
    joinDate: new Date("2022-01-10"),
  });

  // Managers
  const bobManager = await User.create({
    name: "Bob Manager",
    email: "bob.manager@company.com",
    passwordHash,
    role: "manager",
    department: "Engineering",
    managerId: admin._id,
    joinDate: new Date("2022-03-01"),
  });

  const carolManager = await User.create({
    name: "Carol Manager",
    email: "carol.manager@company.com",
    passwordHash,
    role: "manager",
    department: "Product & Design",
    managerId: admin._id,
    joinDate: new Date("2022-04-15"),
  });

  // Employees
  const davidDev = await User.create({
    name: "David Dev",
    email: "david.dev@company.com",
    passwordHash,
    role: "employee",
    department: "Engineering",
    managerId: bobManager._id,
    joinDate: new Date("2023-01-15"),
  });

  const emmaEngineer = await User.create({
    name: "Emma Engineer",
    email: "emma.engineer@company.com",
    passwordHash,
    role: "employee",
    department: "Engineering",
    managerId: bobManager._id,
    joinDate: new Date("2023-02-01"),
  });

  const frankFrontend = await User.create({
    name: "Frank Frontend",
    email: "frank.frontend@company.com",
    passwordHash,
    role: "employee",
    department: "Engineering",
    managerId: bobManager._id,
    joinDate: new Date("2023-05-10"),
  });

  const graceGrowth = await User.create({
    name: "Grace Growth",
    email: "grace.growth@company.com",
    passwordHash,
    role: "employee",
    department: "Product & Design",
    managerId: carolManager._id,
    joinDate: new Date("2023-03-15"),
  });

  const henryHero = await User.create({
    name: "Henry Hero",
    email: "henry.hero@company.com",
    passwordHash,
    role: "employee",
    department: "Product & Design",
    managerId: carolManager._id,
    joinDate: new Date("2023-06-01"),
  });

  const ivyIntern = await User.create({
    name: "Ivy Intern",
    email: "ivy.intern@company.com",
    passwordHash,
    role: "employee",
    department: "Product & Design",
    managerId: carolManager._id,
    joinDate: new Date("2024-01-08"),
  });

  const allUsers = [
    admin,
    bobManager,
    carolManager,
    davidDev,
    emmaEngineer,
    frankFrontend,
    graceGrowth,
    henryHero,
    ivyIntern,
  ];

  console.log(`Created ${allUsers.length} users.`);

  // 3. Create Public Holidays for Current Year
  const currentYear = new Date().getUTCFullYear();
  const holidaysData = [
    { name: "New Year's Day", date: new Date(`${currentYear}-01-01T00:00:00.000Z`) },
    { name: "Memorial Day", date: new Date(`${currentYear}-05-25T00:00:00.000Z`) },
    { name: "Independence Day", date: new Date(`${currentYear}-07-04T00:00:00.000Z`) },
    { name: "Labor Day", date: new Date(`${currentYear}-09-07T00:00:00.000Z`) },
    { name: "Thanksgiving Day", date: new Date(`${currentYear}-11-26T00:00:00.000Z`) },
    { name: "Christmas Day", date: new Date(`${currentYear}-12-25T00:00:00.000Z`) },
  ];

  await Holiday.create(holidaysData);
  console.log(`Created ${holidaysData.length} public holidays.`);

  // 4. Create Balances for current year
  const balancesToInsert = [];
  for (const user of allUsers) {
    for (const lt of leaveTypes) {
      balancesToInsert.push({
        userId: user._id,
        leaveTypeId: lt._id,
        year: currentYear,
        allocated: lt.isPaid ? lt.yearlyAllowance : 0,
        carriedOver: lt.name === "Annual Leave" ? 2 : 0, // 2 days carried over for realism
        used: 0,
        pending: 0,
      });
    }
  }

  await LeaveBalance.create(balancesToInsert);
  console.log(`Initialized balances for all users for ${currentYear}.`);

  // Helper to adjust balance
  const updateBalance = async (userId, leaveTypeId, { used = 0, pending = 0 }) => {
    await LeaveBalance.updateOne(
      { userId, leaveTypeId, year: currentYear },
      { $inc: { used, pending } }
    );
  };

  // 5. Create Sample Leave Requests & Audit Logs
  const now = new Date();

  // Helper to create date relative to now
  const addDays = (days) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };

  // Sample 1: David Dev - Approved Annual Leave (past week)
  const req1 = await LeaveRequest.create({
    userId: davidDev._id,
    leaveTypeId: leaveTypeMap["Annual Leave"]._id,
    startDate: addDays(-7),
    endDate: addDays(-5),
    halfDay: "none",
    days: 3,
    reason: "Family vacation to national park",
    status: "approved",
    decidedBy: bobManager._id,
    decisionComment: "Have a great trip!",
    createdAt: addDays(-14),
  });
  await updateBalance(davidDev._id, leaveTypeMap["Annual Leave"]._id, { used: 3 });
  await AuditLog.create([
    {
      requestId: req1._id,
      actorId: davidDev._id,
      action: "created",
      comment: "Requested 3 day(s) of Annual Leave",
      createdAt: addDays(-14),
    },
    {
      requestId: req1._id,
      actorId: bobManager._id,
      action: "approved",
      comment: "Have a great trip!",
      createdAt: addDays(-12),
    },
  ]);

  // Sample 2: David Dev - Pending Annual Leave (next week)
  const req2 = await LeaveRequest.create({
    userId: davidDev._id,
    leaveTypeId: leaveTypeMap["Annual Leave"]._id,
    startDate: addDays(4),
    endDate: addDays(5),
    halfDay: "none",
    days: 2,
    reason: "Personal home relocation",
    status: "pending",
    createdAt: addDays(-1),
  });
  await updateBalance(davidDev._id, leaveTypeMap["Annual Leave"]._id, { pending: 2 });
  await AuditLog.create({
    requestId: req2._id,
    actorId: davidDev._id,
    action: "created",
    comment: "Requested 2 day(s) of Annual Leave",
    createdAt: addDays(-1),
  });

  // Sample 3: Emma Engineer - Pending Casual Leave (next week)
  const req3 = await LeaveRequest.create({
    userId: emmaEngineer._id,
    leaveTypeId: leaveTypeMap["Casual Leave"]._id,
    startDate: addDays(7),
    endDate: addDays(7),
    halfDay: "none",
    days: 1,
    reason: "Attending friend's wedding ceremony",
    status: "pending",
    createdAt: addDays(-2),
  });
  await updateBalance(emmaEngineer._id, leaveTypeMap["Casual Leave"]._id, { pending: 1 });
  await AuditLog.create({
    requestId: req3._id,
    actorId: emmaEngineer._id,
    action: "created",
    comment: "Requested 1 day(s) of Casual Leave",
    createdAt: addDays(-2),
  });

  // Sample 4: Emma Engineer - Rejected Sick Leave
  const req4 = await LeaveRequest.create({
    userId: emmaEngineer._id,
    leaveTypeId: leaveTypeMap["Sick Leave"]._id,
    startDate: addDays(-10),
    endDate: addDays(-9),
    halfDay: "none",
    days: 2,
    reason: "Routine medical checkup",
    status: "rejected",
    decidedBy: bobManager._id,
    decisionComment: "Routine checkups should use Casual Leave or be scheduled outside peak deployment.",
    createdAt: addDays(-12),
  });
  await AuditLog.create([
    {
      requestId: req4._id,
      actorId: emmaEngineer._id,
      action: "created",
      comment: "Requested 2 day(s) of Sick Leave",
      createdAt: addDays(-12),
    },
    {
      requestId: req4._id,
      actorId: bobManager._id,
      action: "rejected",
      comment: "Routine checkups should use Casual Leave or be scheduled outside peak deployment.",
      createdAt: addDays(-11),
    },
  ]);

  // Sample 5: Frank Frontend - Cancelled Unpaid Leave
  const req5 = await LeaveRequest.create({
    userId: frankFrontend._id,
    leaveTypeId: leaveTypeMap["Unpaid Leave"]._id,
    startDate: addDays(12),
    endDate: addDays(14),
    halfDay: "none",
    days: 3,
    reason: "Extended travel",
    status: "cancelled",
    decisionComment: "Cancelled by Employee",
    createdAt: addDays(-5),
  });
  await AuditLog.create([
    {
      requestId: req5._id,
      actorId: frankFrontend._id,
      action: "created",
      comment: "Requested 3 day(s) of Unpaid Leave",
      createdAt: addDays(-5),
    },
    {
      requestId: req5._id,
      actorId: frankFrontend._id,
      action: "cancelled",
      comment: "Cancelled by Employee",
      createdAt: addDays(-3),
    },
  ]);

  // Sample 6: Grace Growth - Approved Sick Leave
  const req6 = await LeaveRequest.create({
    userId: graceGrowth._id,
    leaveTypeId: leaveTypeMap["Sick Leave"]._id,
    startDate: addDays(-3),
    endDate: addDays(-2),
    halfDay: "none",
    days: 2,
    reason: "Fever and flu rest",
    status: "approved",
    decidedBy: carolManager._id,
    decisionComment: "Get well soon!",
    createdAt: addDays(-4),
  });
  await updateBalance(graceGrowth._id, leaveTypeMap["Sick Leave"]._id, { used: 2 });
  await AuditLog.create([
    {
      requestId: req6._id,
      actorId: graceGrowth._id,
      action: "created",
      comment: "Requested 2 day(s) of Sick Leave",
      createdAt: addDays(-4),
    },
    {
      requestId: req6._id,
      actorId: carolManager._id,
      action: "approved",
      comment: "Get well soon!",
      createdAt: addDays(-3),
    },
  ]);

  // Sample 7: Grace Growth - Pending Half-day Annual Leave
  const req7 = await LeaveRequest.create({
    userId: graceGrowth._id,
    leaveTypeId: leaveTypeMap["Annual Leave"]._id,
    startDate: addDays(3),
    endDate: addDays(3),
    halfDay: "first",
    days: 0.5,
    reason: "Morning dental appointment",
    status: "pending",
    createdAt: addDays(-1),
  });
  await updateBalance(graceGrowth._id, leaveTypeMap["Annual Leave"]._id, { pending: 0.5 });
  await AuditLog.create({
    requestId: req7._id,
    actorId: graceGrowth._id,
    action: "created",
    comment: "Requested 0.5 day(s) of Annual Leave",
    createdAt: addDays(-1),
  });

  // Sample 8: Carol Manager - Pending Annual Leave (Manager request -> Goes to Admin)
  const req8 = await LeaveRequest.create({
    userId: carolManager._id,
    leaveTypeId: leaveTypeMap["Annual Leave"]._id,
    startDate: addDays(10),
    endDate: addDays(11),
    halfDay: "none",
    days: 2,
    reason: "Leadership conference & personal day",
    status: "pending",
    createdAt: addDays(-1),
  });
  await updateBalance(carolManager._id, leaveTypeMap["Annual Leave"]._id, { pending: 2 });
  await AuditLog.create({
    requestId: req8._id,
    actorId: carolManager._id,
    action: "created",
    comment: "Requested 2 day(s) of Annual Leave",
    createdAt: addDays(-1),
  });

  console.log("Database seed completed successfully!");
};

// If executed directly from CLI
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  connectDB()
    .then(async () => {
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}

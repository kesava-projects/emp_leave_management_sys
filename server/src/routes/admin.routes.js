import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getHolidays,
  createHoliday,
  deleteHoliday,
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema } from "../validators/user.validator.js";
import { createLeaveTypeSchema, updateLeaveTypeSchema } from "../validators/leaveType.validator.js";
import { createHolidaySchema } from "../validators/holiday.validator.js";

const router = Router();

// Protect all admin routes
router.use(requireAuth, requireRole("admin"));

// Users CRUD
router.get("/users", getUsers);
router.post("/users", validate(createUserSchema), createUser);
router.get("/users/:id", getUserById);
router.patch("/users/:id", validate(updateUserSchema), updateUser);
router.delete("/users/:id", deleteUser);

// Leave Types CRUD
router.get("/leave-types", getLeaveTypes);
router.post("/leave-types", validate(createLeaveTypeSchema), createLeaveType);
router.patch("/leave-types/:id", validate(updateLeaveTypeSchema), updateLeaveType);
router.delete("/leave-types/:id", deleteLeaveType);

// Holidays CRUD
router.get("/holidays", getHolidays);
router.post("/holidays", validate(createHolidaySchema), createHoliday);
router.delete("/holidays/:id", deleteHoliday);

export default router;

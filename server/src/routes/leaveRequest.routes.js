import { Router } from "express";
import {
  getMyRequests,
  createRequest,
  cancelRequest,
  approveRequest,
  rejectRequest,
  calculateDaysPreview,
} from "../controllers/leaveRequest.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createLeaveRequestSchema,
  approveLeaveSchema,
  rejectLeaveSchema,
  cancelLeaveSchema,
} from "../validators/leaveRequest.validator.js";

const router = Router();

// Employee & all authenticated users
router.get("/", requireAuth, getMyRequests);
router.get("/calculate-days", requireAuth, calculateDaysPreview);
router.post("/", requireAuth, validate(createLeaveRequestSchema), createRequest);
router.patch("/:id/cancel", requireAuth, validate(cancelLeaveSchema), cancelRequest);

// Manager & Admin approvals/rejections
router.patch(
  "/:id/approve",
  requireAuth,
  requireRole("manager", "admin"),
  validate(approveLeaveSchema),
  approveRequest
);
router.patch(
  "/:id/reject",
  requireAuth,
  requireRole("manager", "admin"),
  validate(rejectLeaveSchema),
  rejectRequest
);

export default router;

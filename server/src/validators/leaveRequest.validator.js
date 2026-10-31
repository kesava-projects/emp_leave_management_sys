import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  halfDay: z.enum(["none", "first", "second"]).default("none").optional(),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500, "Reason must be under 500 characters"),
});

export const approveLeaveSchema = z.object({
  comment: z.string().trim().optional(),
});

export const rejectLeaveSchema = z.object({
  comment: z.string().trim().min(1, "Rejection requires a comment"),
});

export const cancelLeaveSchema = z.object({
  comment: z.string().trim().optional(),
});

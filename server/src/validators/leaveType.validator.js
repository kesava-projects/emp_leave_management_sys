import { z } from "zod";

export const createLeaveTypeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  yearlyAllowance: z.number().min(0, "Yearly allowance must be at least 0"),
  carryOverLimit: z.number().min(0, "Carry over limit must be at least 0").optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code (e.g. #3b82f6)").optional(),
  requiresApproval: z.boolean().optional(),
  isPaid: z.boolean().optional(),
});

export const updateLeaveTypeSchema = z.object({
  name: z.string().trim().min(2).optional(),
  yearlyAllowance: z.number().min(0).optional(),
  carryOverLimit: z.number().min(0).optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  requiresApproval: z.boolean().optional(),
  isPaid: z.boolean().optional(),
});

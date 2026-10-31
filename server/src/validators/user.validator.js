import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["employee", "manager", "admin"]),
  department: z.string().trim().min(1, "Department is required"),
  managerId: z.string().nullable().optional(),
  joinDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["employee", "manager", "admin"]).optional(),
  department: z.string().trim().min(1).optional(),
  managerId: z.string().nullable().optional(),
  joinDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

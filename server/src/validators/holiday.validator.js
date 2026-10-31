import { z } from "zod";

export const createHolidaySchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().trim().min(2, "Holiday name is required"),
});

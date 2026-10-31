import { Router } from "express";
import { getReportsSummary, exportReportsCsv } from "../controllers/report.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/summary", getReportsSummary);
router.get("/export.csv", exportReportsCsv);

export default router;

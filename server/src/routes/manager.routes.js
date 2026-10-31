import { Router } from "express";
import { getManagerRequests } from "../controllers/manager.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/requests", requireAuth, requireRole("manager", "admin"), getManagerRequests);

export default router;

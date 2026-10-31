import { Router } from "express";
import { getCalendar } from "../controllers/calendar.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getCalendar);

export default router;

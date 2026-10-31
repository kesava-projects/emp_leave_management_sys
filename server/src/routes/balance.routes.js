import { Router } from "express";
import { getMyBalances } from "../controllers/balance.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, getMyBalances);

export default router;

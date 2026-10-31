import { Router } from "express";
import { login, logout, getMe } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";
import { loginLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);

export default router;

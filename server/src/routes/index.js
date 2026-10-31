import { Router } from "express";
import authRoutes from "./auth.routes.js";
import balanceRoutes from "./balance.routes.js";
import leaveRequestRoutes from "./leaveRequest.routes.js";
import managerRoutes from "./manager.routes.js";
import calendarRoutes from "./calendar.routes.js";
import adminRoutes from "./admin.routes.js";
import reportRoutes from "./report.routes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/balances", balanceRoutes);
apiRouter.use("/requests", leaveRequestRoutes);
apiRouter.use("/manager", managerRoutes);
apiRouter.use("/calendar", calendarRoutes);
apiRouter.use("/reports", reportRoutes);

// Admin CRUD routes mounted directly on /api as specified:
// /api/users, /api/leave-types, /api/holidays
apiRouter.use("/", adminRoutes);
apiRouter.use("/admin", adminRoutes); // Also accessible under /api/admin/*

export default apiRouter;

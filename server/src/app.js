import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

// Security headers
app.use(helmet());

// Cross-Origin Resource Sharing limited to client origin
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Body parsing & Cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", apiRouter);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
});

// Centralized error handling
app.use(errorHandler);

export default app;

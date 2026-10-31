import app from "../server/src/app.js";
import { connectDB } from "../server/src/config/db.js";

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error("MongoDB connection error in serverless handler:", error);
    return res.status(500).json({
      error: {
        code: "DATABASE_CONNECTION_ERROR",
        message: "Failed to connect to the database",
      },
    });
  }

  return app(req, res);
}

import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/leave_management",
  JWT_SECRET: process.env.JWT_SECRET || "super_secret_jwt_key_leave_management_dev_12345",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
};

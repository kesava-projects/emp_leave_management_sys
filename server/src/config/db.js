import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async (uri = env.MONGO_URI) => {
  try {
    const conn = await mongoose.connect(uri);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error(`MongoDB disconnection error: ${error.message}`);
    throw error;
  }
};

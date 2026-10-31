import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

const startServer = async () => {
  try {
    await connectDB();
    console.log(`Connected to MongoDB: ${env.MONGO_URI}`);

    app.listen(env.PORT, () => {
      console.log(`Leave Management API server running on port ${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;

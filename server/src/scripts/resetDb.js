import { connectDB, disconnectDB } from "../config/db.js";
import { seedDatabase } from "./seed.js";

const resetDb = async () => {
  try {
    await connectDB();
    console.log("Resetting database...");
    await seedDatabase();
    console.log("Database reset and re-seeded successfully!");
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("Error during reset-db:", error);
    process.exit(1);
  }
};

resetDb();

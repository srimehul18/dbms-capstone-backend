import dotenv from "dotenv";
import pool from "./config/db.js";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log("MySQL connected successfully");

    app.listen(PORT, () => {
      console.log(`MySociety API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
    process.exit(1);
  }
}

startServer();

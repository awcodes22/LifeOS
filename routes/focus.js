import express from "express";
import pool from "../db.js";

const router = express.Router();

// log a completed session
router.post("/", async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO focus_sessions (user_id, duration, session_type) VALUES ($1, $2, 'focus')",
      [req.session.userId, 25]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Log focus session error:", err.message);
    res.status(500).json({ error: "Failed to log session" });
  }
});

// get total sessions count
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM focus_sessions WHERE user_id = $1",
      [req.session.userId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Get focus sessions error:", err.message);
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

export default router;

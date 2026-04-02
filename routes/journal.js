import express from "express";
import pool from "../db.js";

const router = express.Router();

// get all entries
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM journals WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get journals error:", err.message);
    res.status(500).json({ error: "Failed to load entries" });
  }
});

// add a new entry
router.post("/", async (req, res) => {
  const { title, content, mood } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO journals (user_id, title, content, mood) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.session.userId, title, content, mood]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create journal error:", err.message);
    res.status(500).json({ error: "Failed to save entry" });
  }
});

// update an entry
router.put("/:id", async (req, res) => {
  const { title, content, mood } = req.body;
  try {
    const result = await pool.query(
      "UPDATE journals SET title = $1, content = $2, mood = $3 WHERE id = $4 AND user_id = $5 RETURNING *",
      [title, content, mood, req.params.id, req.session.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Entry not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update journal error:", err.message);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// delete an entry
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM journals WHERE id = $1 AND user_id = $2",
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Delete journal error:", err.message);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

export default router;

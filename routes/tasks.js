import express from "express";
import pool from "../db.js";

const router = express.Router();

// get all tasks
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, user_id, title AS text, description, priority, completed, created_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get tasks error:", err.message);
    res.status(500).json({ error: "Failed to load tasks" });
  }
});

// add a new task
router.post("/", async (req, res) => {
  const { text, description, priority } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO tasks (user_id, title, description, priority) VALUES ($1, $2, $3, $4) RETURNING id, user_id, title AS text, description, priority, completed, created_at",
      [req.session.userId, text, description || null, priority || "medium"]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create task error:", err.message);
    res.status(500).json({ error: "Failed to save task" });
  }
});

// update a task, only fields sent in body are changed
router.put("/:id", async (req, res) => {
  const { text, description, priority, completed } = req.body;

  // fetch current task first so missing fields can be filled  
  try {
    const current = await pool.query(
      "SELECT title, description, priority, completed FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.session.userId]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: "Task not found" });

    const existing = current.rows[0];
    const newTitle = text !== undefined ? text : existing.title;
    const newDescription = description !== undefined ? description : existing.description;
    const newPriority = priority !== undefined ? priority : existing.priority;
    const newCompleted = completed !== undefined ? completed : existing.completed;

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, priority = $3, completed = $4
       WHERE id = $5 AND user_id = $6
       RETURNING id, user_id, title AS text, description, priority, completed, created_at`,
      [newTitle, newDescription, newPriority, newCompleted, req.params.id, req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update task error:", err.message);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// delete a task
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Delete task error:", err.message);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;

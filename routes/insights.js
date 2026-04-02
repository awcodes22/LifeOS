import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const uid = req.session.userId;
  try {
    const countWords = str => (str || '').trim().split(/\s+/).filter(Boolean).length;

    const [journalRows, journals, tasks, focus, journalChart, focusChart, tasksPriority] = await Promise.all([
      pool.query(`SELECT content FROM journals WHERE user_id = $1`, [uid]),
      // journal summary
      pool.query(
        `SELECT
           COUNT(*)::int AS total_logs,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS logs_this_week
         FROM journals WHERE user_id = $1`,
        [uid]
      ),
      pool.query(
        `SELECT
           COUNT(*)::int                                   AS total_tasks,
           COUNT(*) FILTER (WHERE completed = true)::int  AS completed_tasks,
           COUNT(*) FILTER (WHERE completed = false)::int AS pending_tasks
         FROM tasks WHERE user_id = $1`,
        [uid]
      ),
      pool.query(
        `SELECT
           COUNT(*)::int                                                              AS total_sessions,
           COALESCE(SUM(duration), 0)::int                                           AS total_minutes,
           COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days')::int    AS sessions_this_week,
           FLOOR(COUNT(*) / 4)::int                                                  AS full_cycles
         FROM focus_sessions WHERE user_id = $1`,
        [uid]
      ),
      // journal chart data (last 14 days)
      pool.query(
        `SELECT
           TO_CHAR(created_at AT TIME ZONE 'UTC', 'Mon DD') AS day,
           COUNT(*)::int AS count
         FROM journals
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '14 days'
         GROUP BY DATE(created_at AT TIME ZONE 'UTC'), day
         ORDER BY DATE(created_at AT TIME ZONE 'UTC')`,
        [uid]
      ),
      // focus chart data (last 14 days)
      pool.query(
        `SELECT
           TO_CHAR(completed_at AT TIME ZONE 'UTC', 'Mon DD') AS day,
           COUNT(*)::int AS count,
           SUM(duration)::int AS minutes
         FROM focus_sessions
         WHERE user_id = $1 AND completed_at >= NOW() - INTERVAL '14 days'
         GROUP BY DATE(completed_at AT TIME ZONE 'UTC'), day
         ORDER BY DATE(completed_at AT TIME ZONE 'UTC')`,
        [uid]
      ),
      // tasks by priority
      pool.query(
        `SELECT
           COALESCE(priority, 'medium') AS priority,
           COUNT(*)::int AS count
         FROM tasks WHERE user_id = $1
         GROUP BY priority`,
        [uid]
      ),
    ]);

    const totalWords = journalRows.rows.reduce((sum, r) => sum + countWords(r.content), 0);
    const j = journals.rows[0];

    res.json({
      journals: { ...j, total_words: totalWords },
      tasks: tasks.rows[0],
      focus: focus.rows[0],
      journalChart: journalChart.rows,
      focusChart: focusChart.rows,
      tasksPriority: tasksPriority.rows,
    });
  } catch (err) {
    console.error("Insights error:", err.message);
    res.status(500).json({ error: "Failed to load insights" });
  }
});

// journal chart by range
router.get("/journal-chart", async (req, res) => {
  const uid = req.session.userId;
  const range = ["week", "month", "year"].includes(req.query.range) ? req.query.range : "week";

  const interval = range === "year" ? "12 months" : range === "month" ? "30 days" : "7 days";
  const truncUnit = range === "year" ? "month" : "day";
  const dateFormat = range === "year" ? "Mon YYYY" : "Mon DD";

  try {
    const result = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('${truncUnit}', created_at AT TIME ZONE 'UTC'), '${dateFormat}') AS day,
         COUNT(*)::int AS count
       FROM journals
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY DATE_TRUNC('${truncUnit}', created_at AT TIME ZONE 'UTC')
       ORDER BY DATE_TRUNC('${truncUnit}', created_at AT TIME ZONE 'UTC')`,
      [uid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Journal chart error:", err.message);
    res.status(500).json({ error: "Failed to load journal chart" });
  }
});

// focus chart by range
router.get("/focus-chart", async (req, res) => {
  const uid = req.session.userId;
  const range = ["week", "month", "year"].includes(req.query.range) ? req.query.range : "week";

  const interval = range === "year" ? "12 months" : range === "month" ? "30 days" : "7 days";
  const truncUnit = range === "year" ? "month" : "day";
  const dateFormat = range === "year" ? "Mon YYYY" : "Mon DD";

  try {
    const result = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('${truncUnit}', completed_at AT TIME ZONE 'UTC'), '${dateFormat}') AS day,
         COUNT(*)::int AS count,
         SUM(duration)::int AS minutes
       FROM focus_sessions
       WHERE user_id = $1
         AND completed_at >= NOW() - INTERVAL '${interval}'
       GROUP BY DATE_TRUNC('${truncUnit}', completed_at AT TIME ZONE 'UTC')
       ORDER BY DATE_TRUNC('${truncUnit}', completed_at AT TIME ZONE 'UTC')`,
      [uid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Focus chart error:", err.message);
    res.status(500).json({ error: "Failed to load focus chart" });
  }
});

export default router;

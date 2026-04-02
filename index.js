import express from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pool from "./db.js";
import authRoutes from "./routes/auth.js";
import journalRoutes from "./routes/journal.js";
import taskRoutes from "./routes/tasks.js";
import focusRoutes from "./routes/focus.js";
import insightsRoutes from "./routes/insights.js";

const app = express();
const port = process.env.PORT || 3000;

// ------------------- Middleware -------------------

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// trust proxy so sessions work on Vercel
app.set('trust proxy', 1);

// sessions in the db so they survive restarts
const PgSession = pgSession(session);
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// attach user to every template
app.use(async (req, res, next) => {
  if (!req.session.userId) {
    res.locals.user = null;
    return next();
  }
  try {
    const result = await pool.query(
      "SELECT id, name FROM users WHERE id = $1",
      [req.session.userId]
    );
    res.locals.user = result.rows[0] ?? null;
  } catch {
    res.locals.user = { id: req.session.userId, name: req.session.userName };
  }
  next();
});

// block unauthenticated access
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/auth/login");
  res.set('Cache-Control', 'no-store'); // prevent browser back button from showing a logged out session — also stops back-forward cache (bfcache) from restoring a previous account's pages
  next();
}

// ------------------- Routes -------------------

// quote API proxy — keeps the key server-side
const quoteCategories = ["motivational", "inspirational"];

app.get("/api/quote", async (req, res) => {
  const category = quoteCategories[Math.floor(Math.random() * quoteCategories.length)];
  try {
    const response = await fetch(`https://famous-quotes4.p.rapidapi.com/random?category=${category}&count=1`, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "famous-quotes4.p.rapidapi.com",
        "Content-Type": "application/json"
      }
    });
    const [{ text, author }] = await response.json();
    res.json({ q: text, a: author });
  } catch {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

app.use("/auth", authRoutes);
app.use("/api/journal", requireAuth, journalRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/focus", requireAuth, focusRoutes);
app.use("/api/insights", requireAuth, insightsRoutes);

// dashboard
app.get("/", requireAuth, (req, res) => {
  const now = new Date();
  const hour = now.getHours();
  let greeting;
  if (hour < 12)      greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else                greeting = "Good Evening";
  res.render("index.ejs", { greeting });
});

// journal page
app.get("/journal", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total FROM journals WHERE user_id = $1",
    [req.session.userId]
  );
  res.render("journal.ejs", { entryCount: result.rows[0].total });
});

// tasks page
app.get("/tasks", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE completed) ::int AS done FROM tasks WHERE user_id = $1",
    [req.session.userId]
  );
  const { total, done } = result.rows[0];
  res.render("tasks.ejs", { taskTotal: total, taskDone: done });
});

// focus mode page
app.get("/focusMode", requireAuth, (_req, res) => {
  res.render("focusMode.ejs");
});

// insights page
app.get("/insights", requireAuth, async (req, res) => {
  const uid = req.session.userId;
  const countWords = str => (str || '').trim().split(/\s+/).filter(Boolean).length;

  const [journalRows, journals, tasks, focus] = await Promise.all([
    pool.query(`SELECT content FROM journals WHERE user_id = $1`, [uid]),
    pool.query(
      `SELECT COUNT(*)::int AS total_logs,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS logs_this_week
       FROM journals WHERE user_id = $1`, [uid]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total_tasks,
              COUNT(*) FILTER (WHERE completed = true)::int  AS completed_tasks,
              COUNT(*) FILTER (WHERE completed = false)::int AS pending_tasks
       FROM tasks WHERE user_id = $1`, [uid]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total_sessions,
              COALESCE(SUM(duration), 0)::int AS total_minutes,
              COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days')::int AS sessions_this_week,
              FLOOR(COUNT(*) / 4)::int AS full_cycles
       FROM focus_sessions WHERE user_id = $1`, [uid]
    ),
  ]);

  const j = journals.rows[0];
  const t = tasks.rows[0];
  const f = focus.rows[0];

  const totalWords     = journalRows.rows.reduce((sum, r) => sum + countWords(r.content), 0);
  const completionRate = t.total_tasks > 0 ? Math.round((t.completed_tasks / t.total_tasks) * 100) : 0;
  const avgWords       = j.total_logs > 0 ? Math.round(totalWords / j.total_logs) : 0;
  const fmt = (mins) => {
    if (mins === 0) return '0m';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  res.render("insights.ejs", {
    insights: {
      totalLogs:       j.total_logs,
      totalWords:      totalWords.toLocaleString(),
      avgWords,
      logsThisWeek:    j.logs_this_week,
      completedTasks:  t.completed_tasks,
      totalTasks:      t.total_tasks,
      pendingTasks:    t.pending_tasks,
      completionRate,
      focusTime:       fmt(f.total_minutes),
      totalSessions:   f.total_sessions,
      sessionsThisWeek: f.sessions_this_week,
      fullCycles:      f.full_cycles,
    }
  });
});

// ------------------- Start -------------------

// Vercel handles the server in production, app.listen only runs locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;

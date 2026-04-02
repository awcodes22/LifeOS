import express from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";

const router = express.Router();

// serve the pages
router.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("auth/login.ejs", { error: null });
});

router.get("/signup", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("auth/signup.ejs", { error: null });
});

// signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // check if someone already signed up with this email
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.render("auth/signup.ejs", {
        error: "An account with that email already exists.",
      });
    }

    // hash the password before saving, never store plain text
    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name",
      [name, email, hash]
    );

    const user = result.rows[0];

    // log them in right after signup
    req.session.userId = user.id;
    req.session.userName = user.name;

    res.redirect("/");
  } catch (err) {
    console.error("Signup error:", err.message);
    res.render("auth/signup.ejs", { error: "Something went wrong, try again." });
  }
});

// login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.render("auth/login.ejs", {
        error: "No account found with that email.",
      });
    }

    const user = result.rows[0];

    // compare what they typed against the stored hash
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render("auth/login.ejs", { error: "Incorrect password." });
    }

    req.session.userId = user.id;
    req.session.userName = user.name;

    res.redirect("/");
  } catch (err) {
    console.error("Login error:", err.message);
    res.render("auth/login.ejs", { error: "Something went wrong, try again." });
  }
});

// logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
});

export default router;

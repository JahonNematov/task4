const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const { pool, initDB, getUniqIdValue } = require("./db");
const { authMiddleware } = require("./middleware");
const { sendVerificationEmail } = require("./email");

const app = express();
const PORT = process.env.PORT || 5000;

// IMPORTANT: Middleware setup
app.use(cors());
app.use(express.json());

// NOTE: Serve static React build files in production
app.use(express.static(path.join(__dirname, "../client/build")));

// ===================== AUTH ROUTES =====================

// IMPORTANT: Registration endpoint — no auth middleware needed
// NOTA BENE: Email uniqueness is enforced by the database unique index, NOT by code
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  // NOTE: Validate that all fields are provided and password is non-empty
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = getUniqIdValue();

    // IMPORTANT: Insert user — if email already exists, the unique index will throw an error
    // NOTE: We do NOT check for email existence in code — the database handles it
    const result = await pool.query(
      `INSERT INTO users (name, email, password, status, verification_token, created_at)
       VALUES ($1, $2, $3, 'unverified', $4, NOW())
       RETURNING id, name, email, status`,
      [name, email, hashedPassword, verificationToken]
    );

    // NOTA BENE: Send verification email asynchronously — do not await blocking
    sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
      user: result.rows[0],
    });
  } catch (err) {
    // NOTE: PostgreSQL error code 23505 means unique constraint violation
    if (err.code === "23505") {
      return res.status(409).json({ message: "User with this email already exists" });
    }
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// IMPORTANT: Login endpoint — no auth middleware needed
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    // IMPORTANT: Blocked users cannot login
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your account is blocked. Contact administrator." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // NOTE: Update last login time on successful login
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    // IMPORTANT: Generate JWT token with user id
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, status: user.status },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
});

// IMPORTANT: Email verification endpoint — no auth required
app.get("/api/auth/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      "SELECT id, status FROM users WHERE verification_token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    const user = result.rows[0];

    // NOTA BENE: If user is blocked, verification does NOT change their status
    // Only "unverified" status changes to "active"
    if (user.status === "unverified") {
      await pool.query(
        "UPDATE users SET status = 'active', verification_token = NULL WHERE id = $1",
        [user.id]
      );
      return res.json({ message: "Email verified successfully! Your account is now active." });
    }

    // NOTE: Blocked stays blocked even after verification
    res.json({ message: "Email already verified or account status unchanged." });
  } catch (err) {
    console.error("Verification error:", err.message);
    res.status(500).json({ message: "Server error during verification" });
  }
});

// ===================== USER MANAGEMENT ROUTES =====================
// IMPORTANT: All routes below use authMiddleware
// NOTE: The middleware checks user existence and blocked status before each request

// NOTE: Get all users — sorted by last login time descending
app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, status, last_login, created_at
       FROM users
       ORDER BY last_login DESC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch users error:", err.message);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// IMPORTANT: Block selected users
// NOTA BENE: Any user can block themselves or any other user
app.post("/api/users/block", authMiddleware, async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: "No users selected" });
  }

  try {
    await pool.query("UPDATE users SET status = 'blocked' WHERE id = ANY($1)", [userIds]);

    // IMPORTANT: Check if current user blocked themselves
    const selfBlocked = userIds.includes(req.user.id);

    res.json({
      message: `${userIds.length} user(s) blocked successfully`,
      selfBlocked,
    });
  } catch (err) {
    console.error("Block error:", err.message);
    res.status(500).json({ message: "Failed to block users" });
  }
});

// IMPORTANT: Unblock selected users — sets status back to "active"
app.post("/api/users/unblock", authMiddleware, async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: "No users selected" });
  }

  try {
    await pool.query("UPDATE users SET status = 'active' WHERE id = ANY($1)", [userIds]);
    res.json({ message: `${userIds.length} user(s) unblocked successfully` });
  } catch (err) {
    console.error("Unblock error:", err.message);
    res.status(500).json({ message: "Failed to unblock users" });
  }
});

// IMPORTANT: Delete selected users — actually removes rows from the database
// NOTA BENE: Deleted users are truly deleted, not "marked as deleted"
app.post("/api/users/delete", authMiddleware, async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: "No users selected" });
  }

  try {
    // NOTE: Check if current user is deleting themselves
    const selfDeleted = userIds.includes(req.user.id);

    await pool.query("DELETE FROM users WHERE id = ANY($1)", [userIds]);

    res.json({
      message: `${userIds.length} user(s) deleted successfully`,
      selfDeleted,
    });
  } catch (err) {
    console.error("Delete error:", err.message);
    res.status(500).json({ message: "Failed to delete users" });
  }
});

// IMPORTANT: Delete all unverified users
app.post("/api/users/delete-unverified", authMiddleware, async (req, res) => {
  try {
    // NOTE: Check if current user is unverified (they would be deleted too)
    const selfDeleted = req.user.status === "unverified";

    const result = await pool.query("DELETE FROM users WHERE status = 'unverified'");

    res.json({
      message: `${result.rowCount} unverified user(s) deleted`,
      selfDeleted,
    });
  } catch (err) {
    console.error("Delete unverified error:", err.message);
    res.status(500).json({ message: "Failed to delete unverified users" });
  }
});

// NOTE: Catch-all route to serve React app for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});

// IMPORTANT: Initialize database and start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });

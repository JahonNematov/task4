const jwt = require("jsonwebtoken");
const { pool } = require("./db");

// IMPORTANT: Authentication middleware that runs before each request (except login/register)
// NOTE: This checks if the user exists AND is not blocked
// NOTA BENE: If user is blocked or deleted, the response tells the client to redirect to login
async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // NOTE: Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // IMPORTANT: Check if user still exists and is not blocked
    const result = await pool.query("SELECT id, name, email, status FROM users WHERE id = $1", [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(403).json({ message: "Account has been deleted", redirect: true });
    }

    if (result.rows[0].status === "blocked") {
      return res.status(403).json({ message: "Account is blocked", redirect: true });
    }

    // NOTE: Attach user info to request object for downstream handlers
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token", redirect: true });
  }
}

module.exports = { authMiddleware };

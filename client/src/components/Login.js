import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Container, Form, Button, Alert, Card } from "react-bootstrap";
import api from "../api";

// IMPORTANT: Login component for user authentication
// NOTE: Only email and password are required — any non-empty password is accepted
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // IMPORTANT: Handle form submission for login
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      // NOTE: On success, pass token and user data to parent component
      onLogin(response.data.token, response.data.user);
    } catch (err) {
      // NOTA BENE: Display server error message or a generic one
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card style={{ width: "100%", maxWidth: "420px" }} className="shadow-sm">
        <Card.Body className="p-4">
          <h3 className="text-center mb-1">Sign In</h3>
          <p className="text-center text-muted mb-4">User Management App</p>

          {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100 mb-3"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Form>

          <div className="text-center">
            <span className="text-muted">Don't have an account? </span>
            <Link to="/register">Sign up</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;

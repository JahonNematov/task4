import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Alert, Card } from "react-bootstrap";
import api from "../api";

// IMPORTANT: Email verification component
// NOTE: Clicking the verification link changes status from "unverified" to "active"
// NOTA BENE: "blocked" status stays "blocked" even after verification
function VerifyEmail() {
  const { token } = useParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // IMPORTANT: Call verification endpoint on component mount
    async function verify() {
      try {
        const response = await api.get(`/auth/verify/${token}`);
        setMessage(response.data.message);
      } catch (err) {
        setError(err.response?.data?.message || "Verification failed");
      }
    }
    verify();
  }, [token]);

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card style={{ width: "100%", maxWidth: "420px" }} className="shadow-sm">
        <Card.Body className="p-4 text-center">
          <h3 className="mb-4">Email Verification</h3>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          {!message && !error && <p>Verifying your email...</p>}
          <Link to="/login" className="btn btn-primary mt-3">Go to Login</Link>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default VerifyEmail;

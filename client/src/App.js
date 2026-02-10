import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminPanel from "./components/AdminPanel";
import VerifyEmail from "./components/VerifyEmail";

// IMPORTANT: Main App component with routing logic
// NOTE: Non-authenticated users can only access login and register pages
function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // NOTE: Save token and user to localStorage whenever they change
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // IMPORTANT: Logout clears all auth data and redirects to login
  function handleLogout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // IMPORTANT: After successful login, store token and user
  function handleLogin(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={
            token ? <Navigate to="/" /> : <Register />
          }
        />
        <Route
          path="/verify/:token"
          element={<VerifyEmail />}
        />
        <Route
          path="/"
          element={
            token ? (
              <AdminPanel user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export const LoginPage = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      addToast(`Welcome back, ${user.name}!`, "success");

      if (from && from !== "/login") {
        navigate(from, { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin/reports", { replace: true });
      } else if (user.role === "manager") {
        navigate("/manager/approvals", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to log in");
      addToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("Password123!");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "85vh",
        padding: "1rem",
      }}
    >
      <div className="card" style={{ maxWidth: "440px", width: "100%", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🗓️</div>
          <h2>Sign In to LeaveSync</h2>
          <p className="page-subtitle">Employee Leave Management Portal</p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--danger-bg)",
              border: "1px solid var(--danger-border)",
              color: "var(--danger)",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="e.g. david.dev@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem", textAlign: "center" }}>
            Quick Demo Logins (Password: <code>Password123!</code>):
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin("admin@company.com")}
            >
              👑 Alice (Admin)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin("bob.manager@company.com")}
            >
              👔 Bob (Manager)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin("david.dev@company.com")}
            >
              💻 David (Employee)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

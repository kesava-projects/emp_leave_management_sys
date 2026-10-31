import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      addToast("You have been logged out", "info");
      navigate("/login");
    } catch (err) {
      addToast("Failed to logout", "error");
    }
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span>🗓️</span> LeaveSync
      </Link>

      <nav aria-label="Main Navigation">
        <ul className="navbar-nav">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              My Dashboard
            </NavLink>
          </li>

          {(user.role === "manager" || user.role === "admin") && (
            <li>
              <NavLink
                to="/manager/approvals"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                Approvals Queue
              </NavLink>
            </li>
          )}

          <li>
            <NavLink
              to="/calendar"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              Team Calendar
            </NavLink>
          </li>

          {user.role === "admin" && (
            <>
              <li>
                <NavLink
                  to="/admin/employees"
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                >
                  Employees
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/leave-types"
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                >
                  Leave Types
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/holidays"
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                >
                  Holidays
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                >
                  Reports
                </NavLink>
              </li>
            </>
          )}

          <li className="nav-user">
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{user.name}</span>
            <span className="user-badge">{user.role}</span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              title="Logout"
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};

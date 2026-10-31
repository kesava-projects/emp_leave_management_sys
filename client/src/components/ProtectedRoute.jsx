import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="state-center" style={{ minHeight: "60vh" }}>
        <div className="spinner" />
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role-based fallback redirect
    if (user.role === "admin") {
      return <Navigate to="/admin/reports" replace />;
    } else if (user.role === "manager") {
      return <Navigate to="/manager/approvals" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

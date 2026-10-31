import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { Navbar } from "./components/Navbar.jsx";

// Pages
import { LoginPage } from "./pages/LoginPage.jsx";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage.jsx";
import { ManagerDashboardPage } from "./pages/ManagerDashboardPage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { AdminEmployeesPage } from "./pages/AdminEmployeesPage.jsx";
import { AdminLeaveTypesPage } from "./pages/AdminLeaveTypesPage.jsx";
import { AdminHolidaysPage } from "./pages/AdminHolidaysPage.jsx";
import { AdminReportsPage } from "./pages/AdminReportsPage.jsx";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div className="app-container">
            <Navbar />
            <main className="main-content">
              <Routes>
                {/* Public route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Employee / Authenticated routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <EmployeeDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  }
                />

                {/* Manager & Admin routes */}
                <Route
                  path="/manager/approvals"
                  element={
                    <ProtectedRoute allowedRoles={["manager", "admin"]}>
                      <ManagerDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin-only routes */}
                <Route
                  path="/admin/employees"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminEmployeesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/leave-types"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminLeaveTypesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/holidays"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminHolidaysPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminReportsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="*"
                  element={
                    <div className="state-center" style={{ minHeight: "50vh" }}>
                      <h2>404 - Page Not Found</h2>
                      <p style={{ marginTop: "0.5rem" }}>
                        The requested page does not exist.
                      </p>
                    </div>
                  }
                />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;

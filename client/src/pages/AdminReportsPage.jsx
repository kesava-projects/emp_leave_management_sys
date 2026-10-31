import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

export const AdminReportsPage = () => {
  const { addToast } = useToast();

  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [department, setDepartment] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getReportsSummary({ year, department });
      setSummary(res);
    } catch (err) {
      addToast(err.message || "Failed to load reports summary", "error");
    } finally {
      setLoading(false);
    }
  }, [year, department, addToast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleDownloadCsv = async () => {
    try {
      setDownloading(true);
      const blob = await api.exportReportsCsv({ year, department });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave-report-${year}${department ? `-${department}` : ""}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast("CSV report downloaded successfully!", "success");
    } catch (err) {
      addToast(err.message || "Failed to export CSV report", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Analytics & Reports</h1>
          <p className="page-subtitle">Aggregate summary metrics and historical records export</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleDownloadCsv}
          disabled={downloading}
        >
          {downloading ? "Exporting CSV..." : "📥 Download Full CSV Report"}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Report Year:
            </label>
            <select
              className="form-control"
              style={{ width: "110px" }}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Department:
            </label>
            <select
              className="form-control"
              style={{ width: "200px" }}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Product & Design">Product & Design</option>
              <option value="Human Resources">Human Resources</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={loadSummary}>
            Apply Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-center">
          <div className="spinner" />
          <p>Generating reports summary...</p>
        </div>
      ) : (
        <>
          {/* Key Stat Cards */}
          <div className="grid-cols-4" style={{ marginBottom: "1.5rem" }}>
            <div className="card" style={{ marginBottom: 0, textAlign: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
                Total Requests
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, margin: "0.3rem 0" }}>
                {summary?.statusSummary?.total || 0}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>all applications in {year}</div>
            </div>

            <div className="card" style={{ marginBottom: 0, textAlign: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
                Approved Days Taken
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, margin: "0.3rem 0", color: "var(--success)" }}>
                {summary?.statusSummary?.approvedDays || 0}d
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {summary?.statusSummary?.approved || 0} approved requests
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0, textAlign: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
                Pending Review
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, margin: "0.3rem 0", color: "var(--warning)" }}>
                {summary?.statusSummary?.pending || 0}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>awaiting manager action</div>
            </div>

            <div className="card" style={{ marginBottom: 0, textAlign: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
                Rejected / Cancelled
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, margin: "0.3rem 0", color: "var(--neutral)" }}>
                {(summary?.statusSummary?.rejected || 0) + (summary?.statusSummary?.cancelled || 0)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {summary?.statusSummary?.rejected || 0} rejected, {summary?.statusSummary?.cancelled || 0} cancelled
              </div>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="grid-cols-2">
            {/* By Leave Type */}
            <div className="card">
              <div className="card-header">
                <h3>Leave Taken by Category</h3>
              </div>
              {summary?.leaveTypeBreakdown?.length === 0 ? (
                <div className="state-center" style={{ padding: "1.5rem" }}>
                  <p>No approved leaves for this period.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Approved Requests</th>
                        <th>Total Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary?.leaveTypeBreakdown?.map((lt) => (
                        <tr key={lt._id}>
                          <td>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span
                                className="balance-color-dot"
                                style={{ backgroundColor: lt.color || "#3b82f6" }}
                              />
                              <strong>{lt.name}</strong>
                            </span>
                          </td>
                          <td>{lt.count}</td>
                          <td>
                            <strong>{lt.days}d</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* By Department */}
            <div className="card">
              <div className="card-header">
                <h3>Leave Taken by Department</h3>
              </div>
              {summary?.departmentBreakdown?.length === 0 ? (
                <div className="state-center" style={{ padding: "1.5rem" }}>
                  <p>No department data for this period.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Approved Requests</th>
                        <th>Total Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary?.departmentBreakdown?.map((dept) => (
                        <tr key={dept._id}>
                          <td>
                            <strong>{dept.department}</strong>
                          </td>
                          <td>{dept.count}</td>
                          <td>
                            <strong>{dept.days}d</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

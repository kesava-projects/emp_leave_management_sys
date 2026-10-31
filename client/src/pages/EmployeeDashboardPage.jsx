import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { StatusChip } from "../components/StatusChip.jsx";
import { Modal } from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [halfDay, setHalfDay] = useState("none");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [cancelComment, setCancelComment] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Load dashboard data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [balRes, reqRes, ltRes] = await Promise.all([
        api.getMyBalances(),
        api.getMyRequests(),
        api.getLeaveTypes(),
      ]);
      setBalances(balRes.balances || []);
      setRequests(reqRes.requests || []);
      setLeaveTypes(ltRes.leaveTypes || []);

      if (ltRes.leaveTypes && ltRes.leaveTypes.length > 0 && !leaveTypeId) {
        setLeaveTypeId(ltRes.leaveTypes[0]._id);
      }
    } catch (err) {
      addToast(err.message || "Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, leaveTypeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Working Days Calculation & Inline Validation
  useEffect(() => {
    let active = true;

    if (!startDate || !endDate) {
      setCalculatedDays(null);
      setValidationError("");
      return;
    }

    if (endDate < startDate) {
      setCalculatedDays(0);
      setValidationError("End date cannot be earlier than start date");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (startDate < todayStr && user?.role !== "admin") {
      setValidationError("Start date cannot be in the past");
    } else {
      setValidationError("");
    }

    if (halfDay !== "none" && startDate !== endDate) {
      setValidationError("Half-day leave must be requested for a single date");
      setCalculatedDays(null);
      return;
    }

    const fetchDays = async () => {
      setCalcLoading(true);
      try {
        const res = await api.calculateDays(startDate, endDate, halfDay);
        if (active) {
          setCalculatedDays(res.days);
          if (res.days === 0) {
            setValidationError("Selected date range contains no working days (weekends or public holidays)");
          }
        }
      } catch (err) {
        if (active) {
          setCalculatedDays(null);
          setValidationError(err.message || "Unable to calculate working days");
        }
      } finally {
        if (active) setCalcLoading(false);
      }
    };

    const timer = setTimeout(fetchDays, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [startDate, endDate, halfDay, user?.role]);

  // Handle Form Submit
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (validationError) {
      addToast(validationError, "error");
      return;
    }

    // Check balance
    const selectedBalance = balances.find((b) => b.leaveTypeId?._id === leaveTypeId);
    if (selectedBalance && !selectedBalance.isUnlimited) {
      if (calculatedDays > selectedBalance.remaining) {
        addToast(`Insufficient balance. You only have ${selectedBalance.remaining} day(s) available.`, "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.createRequest({
        leaveTypeId,
        startDate,
        endDate,
        halfDay,
        reason,
      });

      addToast("Leave request submitted successfully!", "success");
      // Reset form
      setReason("");
      setStartDate("");
      setEndDate("");
      setHalfDay("none");
      setCalculatedDays(null);
      loadData();
    } catch (err) {
      addToast(err.message || "Failed to submit leave request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Cancel Modal
  const openCancelModal = (req) => {
    setSelectedRequest(req);
    setCancelComment("");
    setCancelModalOpen(true);
  };

  // Execute Cancel
  const handleConfirmCancel = async () => {
    if (!selectedRequest) return;
    setCancelling(true);
    try {
      await api.cancelRequest(selectedRequest._id, cancelComment);
      addToast("Leave request cancelled successfully", "info");
      setCancelModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message || "Failed to cancel request", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="state-center">
        <div className="spinner" />
        <p>Loading your leave dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}</h1>
          <p className="page-subtitle">Department: {user?.department} | Role: {user?.role}</p>
        </div>
      </div>

      {/* Balance Cards */}
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Leave Balances ({new Date().getUTCFullYear()})</h2>
      <div className="grid-cols-4" style={{ marginBottom: "2rem" }}>
        {balances.map((bal) => {
          const totalAllowed = (bal.allocated || 0) + (bal.carriedOver || 0);
          const usedPct = totalAllowed > 0 ? ((bal.used || 0) / totalAllowed) * 100 : 0;
          const pendingPct = totalAllowed > 0 ? ((bal.pending || 0) / totalAllowed) * 100 : 0;

          return (
            <div key={bal._id} className="balance-card">
              <div className="balance-header">
                <span className="balance-title">
                  <span
                    className="balance-color-dot"
                    style={{ backgroundColor: bal.leaveTypeId?.color || "#3b82f6" }}
                  />
                  {bal.leaveTypeId?.name}
                </span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  {bal.isUnlimited ? "∞" : `${bal.remaining}d left`}
                </span>
              </div>

              {!bal.isUnlimited ? (
                <>
                  <div className="balance-progress-bar">
                    <div
                      className="bar-segment-used"
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                      title={`Used: ${bal.used} days`}
                    />
                    <div
                      className="bar-segment-pending"
                      style={{ width: `${Math.min(pendingPct, 100 - usedPct)}%` }}
                      title={`Pending: ${bal.pending} days`}
                    />
                  </div>
                  <div className="balance-stats">
                    <span>Used: {bal.used}d</span>
                    <span>Pending: {bal.pending}d</span>
                    <span>Total: {totalAllowed}d</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  Uncapped allowance (requires approval)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Two Column Section: Request Form & Request History */}
      <div className="grid-cols-2" style={{ alignItems: "start" }}>
        {/* Form Card */}
        <div className="card">
          <div className="card-header">
            <h3>Apply for Leave</h3>
          </div>

          <form onSubmit={handleApplyLeave}>
            <div className="form-group">
              <label className="form-label" htmlFor="leaveType">
                Leave Type
              </label>
              <select
                id="leaveType"
                className="form-control"
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                required
              >
                {leaveTypes.map((lt) => (
                  <option key={lt._id} value={lt._id}>
                    {lt.name} {lt.isPaid ? `(${lt.yearlyAllowance} days/yr)` : "(Unpaid)"}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="startDate">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate || endDate < e.target.value) {
                      setEndDate(e.target.value);
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="endDate">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="halfDay">
                Half Day Option
              </label>
              <select
                id="halfDay"
                className="form-control"
                value={halfDay}
                onChange={(e) => setHalfDay(e.target.value)}
              >
                <option value="none">Full Day(s)</option>
                <option value="first">First Half (Morning)</option>
                <option value="second">Second Half (Afternoon)</option>
              </select>
              <small className="form-hint">
                Half-day requests are valid for single-date applications.
              </small>
            </div>

            {/* Live Calculation Preview & Inline Warning */}
            {calcLoading && <p className="form-hint">Calculating working days...</p>}
            {calculatedDays !== null && !calcLoading && (
              <div
                style={{
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: validationError ? "var(--danger-bg)" : "var(--primary-light)",
                  border: `1px solid ${validationError ? "var(--danger-border)" : "var(--border-color)"}`,
                  fontSize: "0.875rem",
                }}
              >
                <strong>Working Days Count: </strong>
                <span>{calculatedDays} day(s) (excludes weekends & public holidays)</span>
                {validationError && (
                  <p style={{ color: "var(--danger)", marginTop: "0.25rem", fontWeight: 500 }}>
                    ⚠️ {validationError}
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="reason">
                Reason
              </label>
              <textarea
                id="reason"
                rows="3"
                className="form-control"
                placeholder="Please state the purpose of your leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={submitting || Boolean(validationError) || calculatedDays === 0}
            >
              {submitting ? "Submitting Request..." : "Submit Leave Request"}
            </button>
          </form>
        </div>

        {/* Requests Table Card */}
        <div className="card">
          <div className="card-header">
            <h3>My Leave History</h3>
          </div>

          {requests.length === 0 ? (
            <div className="state-center">
              <div className="empty-state-icon">📄</div>
              <p>No leave requests found.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            className="balance-color-dot"
                            style={{ backgroundColor: req.leaveTypeId?.color || "#3b82f6" }}
                          />
                          {req.leaveTypeId?.name}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem" }}>
                          {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                          {req.halfDay !== "none" && (
                            <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                              ({req.halfDay} half)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>{req.days}</strong>
                      </td>
                      <td>
                        <StatusChip status={req.status} />
                        {req.decisionComment && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                            {req.decisionComment}
                          </div>
                        )}
                      </td>
                      <td>
                        {req.status === "pending" && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openCancelModal(req)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Leave Request"
      >
        <p style={{ marginBottom: "1rem" }}>
          Are you sure you want to cancel your leave request for{" "}
          <strong>
            {selectedRequest?.days} day(s) of {selectedRequest?.leaveTypeId?.name}
          </strong>
          ? Your reserved balance will be restored immediately.
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="cancelComment">
            Reason for cancellation (optional):
          </label>
          <input
            id="cancelComment"
            type="text"
            className="form-control"
            placeholder="e.g. Plans changed"
            value={cancelComment}
            onChange={(e) => setCancelComment(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCancelModalOpen(false)}
            disabled={cancelling}
          >
            Keep Request
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirmCancel}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

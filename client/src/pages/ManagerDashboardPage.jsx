import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusChip } from "../components/StatusChip.jsx";
import { Modal } from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export const ManagerDashboardPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decisionAction, setDecisionAction] = useState("approve"); // 'approve' | 'reject'
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getManagerRequests(statusFilter === "all" ? "" : statusFilter);
      setRequests(res.requests || []);
    } catch (err) {
      addToast(err.message || "Failed to load team requests", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, addToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openDecisionModal = (req, action) => {
    setSelectedRequest(req);
    setDecisionAction(action);
    setComment(action === "approve" ? "Approved" : "");
    setDecisionModalOpen(true);
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (decisionAction === "reject" && (!comment || !comment.trim())) {
      addToast("Rejection requires a comment", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (decisionAction === "approve") {
        await api.approveRequest(selectedRequest._id, comment);
        addToast(`Approved leave request for ${selectedRequest.userId?.name}`, "success");
      } else {
        await api.rejectRequest(selectedRequest._id, comment);
        addToast(`Rejected leave request for ${selectedRequest.userId?.name}`, "info");
      }

      setDecisionModalOpen(false);
      loadRequests();
    } catch (err) {
      addToast(err.message || "Failed to process request decision", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Approvals Queue</h1>
          <p className="page-subtitle">
            Review and decide on leave applications from your direct reports
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/calendar" className="btn btn-secondary">
            📅 View Team Calendar
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h3>Direct Reports Requests</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "pending" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setStatusFilter("pending")}
              >
                Pending ({requests.filter((r) => r.status === "pending").length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setStatusFilter("all")}
              >
                All Requests
              </button>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadRequests}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="state-center">
            <div className="spinner" />
            <p>Loading pending requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="state-center">
            <div className="empty-state-icon">✅</div>
            <h4>Queue is clear!</h4>
            <p>There are no {statusFilter === "pending" ? "pending" : ""} leave requests awaiting your decision.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates & Duration</th>
                  <th>Working Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id}>
                    <td>
                      <div>
                        <strong>{req.userId?.name}</strong>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {req.userId?.email} • {req.userId?.department}
                        </div>
                      </div>
                    </td>
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
                      <div>
                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                        {req.halfDay !== "none" && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            ({req.halfDay} half)
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{req.days}d</strong>
                    </td>
                    <td style={{ maxWidth: "250px" }}>
                      <span title={req.reason}>{req.reason}</span>
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
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => openDecisionModal(req, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => openDecisionModal(req, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={decisionAction === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
      >
        <form onSubmit={handleDecisionSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>Employee:</strong> {selectedRequest?.userId?.name}
            </p>
            <p>
              <strong>Leave Type:</strong> {selectedRequest?.leaveTypeId?.name} ({selectedRequest?.days} days)
            </p>
            <p>
              <strong>Dates:</strong> {new Date(selectedRequest?.startDate).toLocaleDateString()} to{" "}
              {new Date(selectedRequest?.endDate).toLocaleDateString()}
            </p>
            <p>
              <strong>Reason:</strong> {selectedRequest?.reason}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="decisionComment">
              {decisionAction === "approve" ? "Approval Comment (optional):" : "Rejection Reason (required):"}
            </label>
            <textarea
              id="decisionComment"
              rows="3"
              className="form-control"
              placeholder={
                decisionAction === "approve"
                  ? "e.g. Approved, cover arranged."
                  : "e.g. Critical project milestone scheduled for this week."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required={decisionAction === "reject"}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDecisionModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${decisionAction === "approve" ? "btn-success" : "btn-danger"}`}
              disabled={submitting}
            >
              {submitting
                ? "Processing..."
                : decisionAction === "approve"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

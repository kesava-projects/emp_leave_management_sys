import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { Modal } from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export const AdminLeaveTypesPage = () => {
  const { addToast } = useToast();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    yearlyAllowance: 10,
    carryOverLimit: 0,
    color: "#2563eb",
    requiresApproval: true,
    isPaid: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadLeaveTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getLeaveTypes();
      setLeaveTypes(res.leaveTypes || []);
    } catch (err) {
      addToast(err.message || "Failed to load leave types", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadLeaveTypes();
  }, [loadLeaveTypes]);

  const openCreateModal = () => {
    setEditingType(null);
    setFormData({
      name: "",
      yearlyAllowance: 15,
      carryOverLimit: 5,
      color: "#2563eb",
      requiresApproval: true,
      isPaid: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (lt) => {
    setEditingType(lt);
    setFormData({
      name: lt.name,
      yearlyAllowance: lt.yearlyAllowance,
      carryOverLimit: lt.carryOverLimit || 0,
      color: lt.color || "#2563eb",
      requiresApproval: lt.requiresApproval,
      isPaid: lt.isPaid,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        yearlyAllowance: Number(formData.yearlyAllowance),
        carryOverLimit: Number(formData.carryOverLimit),
        color: formData.color,
        requiresApproval: formData.requiresApproval,
        isPaid: formData.isPaid,
      };

      if (editingType) {
        await api.updateLeaveType(editingType._id, payload);
        addToast(`Updated ${payload.name} successfully`, "success");
      } else {
        await api.createLeaveType(payload);
        addToast(`Created leave type ${payload.name} successfully`, "success");
      }

      setModalOpen(false);
      loadLeaveTypes();
    } catch (err) {
      addToast(err.message || "Failed to save leave type", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Types Configuration</h1>
          <p className="page-subtitle">Configure leave categories, allowances, carry-over rules, and colors</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + New Leave Type
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="state-center">
            <div className="spinner" />
            <p>Loading leave types...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Color & Name</th>
                  <th>Yearly Allowance</th>
                  <th>Carry-over Limit</th>
                  <th>Type</th>
                  <th>Approval Required</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((lt) => (
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
                    <td>
                      {lt.isPaid ? `${lt.yearlyAllowance} days/yr` : "Unlimited (Unpaid)"}
                    </td>
                    <td>{lt.carryOverLimit || 0} days</td>
                    <td>
                      <span
                        className="status-chip"
                        style={{
                          backgroundColor: lt.isPaid ? "var(--success-bg)" : "var(--neutral-bg)",
                          color: lt.isPaid ? "var(--success)" : "var(--neutral)",
                        }}
                      >
                        {lt.isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td>{lt.requiresApproval ? "Yes" : "No"}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(lt)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingType ? `Edit Leave Type: ${editingType.name}` : "Create Leave Type"}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="ltName">
              Leave Type Name
            </label>
            <input
              id="ltName"
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="ltAllowance">
                Yearly Allowance (Days)
              </label>
              <input
                id="ltAllowance"
                type="number"
                min="0"
                className="form-control"
                value={formData.yearlyAllowance}
                onChange={(e) => setFormData({ ...formData, yearlyAllowance: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ltCarry">
                Carry-Over Limit (Days)
              </label>
              <input
                id="ltCarry"
                type="number"
                min="0"
                className="form-control"
                value={formData.carryOverLimit}
                onChange={(e) => setFormData({ ...formData, carryOverLimit: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ltColor">
              Display Color (Hex)
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                id="ltColorPicker"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{ width: "45px", height: "38px", border: "none", cursor: "pointer", borderRadius: "4px" }}
              />
              <input
                id="ltColor"
                type="text"
                className="form-control"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "2rem", margin: "1rem 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.isPaid}
                onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
              />
              <span>Is Paid Leave</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.requiresApproval}
                onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
              />
              <span>Requires Approval</span>
            </label>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : editingType ? "Update Leave Type" : "Create Leave Type"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

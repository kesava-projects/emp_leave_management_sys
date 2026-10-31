import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { Modal } from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export const AdminEmployeesPage = () => {
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    department: "Engineering",
    managerId: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getUsers({ search });
      setUsers(res.users || []);

      // Filter managers for the manager selection dropdown
      const mgrs = (res.users || []).filter(
        (u) => u.role === "manager" || u.role === "admin"
      );
      setManagers(mgrs);
    } catch (err) {
      addToast(err.message || "Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "Password123!",
      role: "employee",
      department: "Engineering",
      managerId: managers[0]?._id || "",
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: "", // Leave blank if not changing
      role: u.role,
      department: u.department,
      managerId: u.managerId?._id || "",
      isActive: u.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        managerId: formData.managerId || null,
        isActive: formData.isActive,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await api.updateUser(editingUser._id, payload);
        addToast(`Updated ${payload.name} successfully`, "success");
      } else {
        await api.createUser(payload);
        addToast(`Created employee ${payload.name} successfully`, "success");
      }

      setModalOpen(false);
      loadUsers();
    } catch (err) {
      addToast(err.message || "Failed to save employee details", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.updateUser(u._id, { isActive: !u.isActive });
      addToast(`${u.name} is now ${!u.isActive ? "Active" : "Inactive"}`, "info");
      loadUsers();
    } catch (err) {
      addToast(err.message || "Failed to update status", "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">Manage company staff, assignments, and roles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add New Employee
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <input
            type="text"
            className="form-control"
            style={{ maxWidth: "300px" }}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={loadUsers}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="state-center">
            <div className="spinner" />
            <p>Loading employees...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div>
                        <strong>{u.name}</strong>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {u.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="user-badge">{u.role}</span>
                    </td>
                    <td>{u.department}</td>
                    <td>{u.managerId ? u.managerId.name : <span style={{ color: "var(--text-muted)" }}>None (Admin)</span>}</td>
                    <td>
                      <span
                        className="status-chip"
                        style={{
                          backgroundColor: u.isActive ? "var(--success-bg)" : "var(--neutral-bg)",
                          color: u.isActive ? "var(--success)" : "var(--neutral)",
                        }}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(u)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-success"}`}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit Employee: ${editingUser.name}` : "Create New Employee"}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="empName">
              Full Name
            </label>
            <input
              id="empName"
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="empEmail">
              Email Address
            </label>
            <input
              id="empEmail"
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="empPassword">
              {editingUser ? "Password (leave blank to keep unchanged)" : "Password"}
            </label>
            <input
              id="empPassword"
              type="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="empRole">
                Role
              </label>
              <select
                id="empRole"
                className="form-control"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="empDept">
                Department
              </label>
              <input
                id="empDept"
                type="text"
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="empManager">
              Reporting Manager
            </label>
            <select
              id="empManager"
              className="form-control"
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
            >
              <option value="">None (Top level / Self-reporting)</option>
              {managers
                .filter((m) => !editingUser || m._id !== editingUser._id)
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role} - {m.department})
                  </option>
                ))}
            </select>
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
              {submitting ? "Saving..." : editingUser ? "Update Employee" : "Create Employee"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

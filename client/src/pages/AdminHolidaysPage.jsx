import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { Modal } from "../components/Modal.jsx";
import { useToast } from "../context/ToastContext.jsx";

export const AdminHolidaysPage = () => {
  const { addToast } = useToast();

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getUTCFullYear());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getHolidays(selectedYear);
      setHolidays(res.holidays || []);
    } catch (err) {
      addToast(err.message || "Failed to load public holidays", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, addToast]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createHoliday({ name, date });
      addToast(`Added holiday "${name}" successfully`, "success");
      setName("");
      setDate("");
      setModalOpen(false);
      loadHolidays();
    } catch (err) {
      addToast(err.message || "Failed to add holiday", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, holidayName) => {
    if (!window.confirm(`Delete holiday "${holidayName}"?`)) return;

    try {
      await api.deleteHoliday(id);
      addToast(`Deleted holiday "${holidayName}"`, "info");
      loadHolidays();
    } catch (err) {
      addToast(err.message || "Failed to delete holiday", "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Public Holidays Calendar</h1>
          <p className="page-subtitle">Configure official holidays that are excluded from working day counts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Add Public Holiday
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Select Year:
            </label>
            <select
              className="form-control"
              style={{ width: "120px" }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadHolidays}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="state-center">
            <div className="spinner" />
            <p>Loading holidays...</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="state-center">
            <div className="empty-state-icon">🏖️</div>
            <h4>No holidays configured for {selectedYear}</h4>
            <p>Click "Add Public Holiday" above to add statutory holidays.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Holiday Name</th>
                  <th>Date</th>
                  <th>Day of Week</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => {
                  const d = new Date(h.date);
                  return (
                    <tr key={h._id}>
                      <td>
                        <strong>{h.name}</strong>
                      </td>
                      <td>{d.toLocaleDateString(undefined, { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}</td>
                      <td>{d.toLocaleDateString(undefined, { timeZone: "UTC", weekday: "long" })}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(h._id, h.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Public Holiday">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="holName">
              Holiday Name
            </label>
            <input
              id="holName"
              type="text"
              className="form-control"
              placeholder="e.g. Labor Day"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="holDate">
              Date
            </label>
            <input
              id="holDate"
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
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
              {submitting ? "Adding..." : "Add Holiday"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

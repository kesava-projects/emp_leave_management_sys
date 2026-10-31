import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

export const CalendarPage = () => {
  const { addToast } = useToast();

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getUTCMonth() + 1); // 1-12
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthString = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const loadCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCalendar(monthString);
      setCalendarData(res);
    } catch (err) {
      addToast(err.message || "Failed to load calendar data", "error");
    } finally {
      setLoading(false);
    }
  }, [monthString, addToast]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getUTCFullYear());
    setCurrentMonth(today.getUTCMonth() + 1);
  };

  // Build array of days: 1 .. daysInMonth
  const daysInMonth = calendarData?.daysInMonth || 30;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Month formatted title
  const monthTitle = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).toLocaleString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  // Quick lookup maps
  const holidaysMap = {};
  if (calendarData?.holidays) {
    calendarData.holidays.forEach((h) => {
      const day = new Date(h.date).getUTCDate();
      holidaysMap[day] = h.name;
    });
  }

  const isWeekendDay = (day) => {
    const d = new Date(Date.UTC(currentYear, currentMonth - 1, day));
    const dayOfWeek = d.getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sun or Sat
  };

  const getDayOfWeekName = (day) => {
    const d = new Date(Date.UTC(currentYear, currentMonth - 1, day));
    return d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Leave Calendar</h1>
          <p className="page-subtitle">
            Overview of scheduled and pending leaves across the team
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                backgroundColor: "var(--primary)",
                display: "inline-block",
              }}
            />
            <span>Approved</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
            <span
              className="leave-block-pending"
              style={{ width: "16px", height: "16px", display: "inline-block" }}
            />
            <span>Pending (Striped)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                backgroundColor: "var(--warning-bg)",
                border: "1px solid var(--warning-border)",
                display: "inline-block",
              }}
            />
            <span>Holiday</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                backgroundColor: "var(--bg-card-hover)",
                display: "inline-block",
              }}
            />
            <span>Weekend</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {/* Calendar Navigation */}
        <div className="calendar-header-controls">
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>
              &larr; Prev
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleToday}>
              Today
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}>
              Next &rarr;
            </button>
          </div>

          <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{monthTitle}</h3>

          <div style={{ width: "120px" }} />
        </div>

        {loading ? (
          <div className="state-center">
            <div className="spinner" />
            <p>Loading team schedule...</p>
          </div>
        ) : (
          <div className="calendar-view">
            <table className="calendar-grid-table">
              <thead>
                <tr>
                  <th className="user-cell-name">Team Member</th>
                  {daysArray.map((day) => {
                    const isWknd = isWeekendDay(day);
                    const holidayName = holidaysMap[day];

                    return (
                      <th
                        key={day}
                        className={`calendar-day-header ${isWknd ? "weekend" : ""} ${
                          holidayName ? "holiday" : ""
                        }`}
                        title={holidayName ? `Public Holiday: ${holidayName}` : undefined}
                      >
                        <div>{day}</div>
                        <div style={{ fontSize: "0.65rem", fontWeight: 400 }}>
                          {getDayOfWeekName(day)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {calendarData?.team?.map(({ user, requests }) => (
                  <tr key={user._id}>
                    <td className="user-cell-name">
                      <div>{user.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {user.department}
                      </div>
                    </td>

                    {daysArray.map((day) => {
                      const isWknd = isWeekendDay(day);
                      const holidayName = holidaysMap[day];
                      const dateObj = new Date(Date.UTC(currentYear, currentMonth - 1, day));

                      // Find matching request for this day
                      const matchingRequest = requests.find((r) => {
                        const start = new Date(r.startDate);
                        const end = new Date(r.endDate);
                        return dateObj >= start && dateObj <= end;
                      });

                      let cellContent = null;
                      if (matchingRequest) {
                        const isPending = matchingRequest.status === "pending";
                        const isHalf = matchingRequest.halfDay && matchingRequest.halfDay !== "none";

                        cellContent = (
                          <div
                            className={isPending ? "leave-block-pending" : "leave-block-approved"}
                            style={{
                              backgroundColor: !isPending
                                ? matchingRequest.leaveTypeId?.color || "var(--primary)"
                                : undefined,
                            }}
                            title={`${matchingRequest.leaveTypeId?.name} (${matchingRequest.status}): ${matchingRequest.reason}`}
                          >
                            {isHalf ? "½" : "●"}
                          </div>
                        );
                      }

                      return (
                        <td
                          key={day}
                          className={`calendar-cell ${isWknd ? "weekend" : ""} ${
                            holidayName ? "holiday" : ""
                          }`}
                          title={holidayName || undefined}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

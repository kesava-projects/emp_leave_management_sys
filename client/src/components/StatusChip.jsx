import React from "react";

export const StatusChip = ({ status }) => {
  const normalized = (status || "pending").toLowerCase();
  return (
    <span className={`status-chip ${normalized}`}>
      {normalized}
    </span>
  );
};

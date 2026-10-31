import { Holiday } from "../models/Holiday.js";

/**
 * Format a Date to 'YYYY-MM-DD' string using UTC
 */
export const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export const isWeekend = (date) => {
  const day = new Date(date).getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

/**
 * Get holidays between start and end dates from database or holiday list
 */
export const getHolidaysInRange = async (startDate, endDate) => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end },
  }).lean();

  return holidays;
};

/**
 * Calculates working days between startDate and endDate (inclusive),
 * excluding weekends and public holidays.
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {string} halfDay 'none' | 'first' | 'second'
 * @param {Array} holidays Optional array of holiday objects or strings
 * @returns {number} Count of working days
 */
export const calculateWorkingDays = (
  startDate,
  endDate,
  halfDay = "none",
  holidays = []
) => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid start or end date");
  }

  if (end < start) {
    throw new Error("End date cannot be before start date");
  }

  // Convert holiday dates to set of 'YYYY-MM-DD'
  const holidaySet = new Set(
    holidays.map((h) => {
      const d = h.date ? new Date(h.date) : new Date(h);
      return formatDateKey(d);
    })
  );

  if (halfDay && halfDay !== "none") {
    const isSameDay = formatDateKey(start) === formatDateKey(end);
    if (!isSameDay) {
      throw new Error("Half-day leave must be requested for a single day");
    }

    if (isWeekend(start) || holidaySet.has(formatDateKey(start))) {
      return 0;
    }
    return 0.5;
  }

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dateKey = formatDateKey(current);
    const dayOfWeek = current.getUTCDay();

    const isNonWorking = dayOfWeek === 0 || dayOfWeek === 6 || holidaySet.has(dateKey);
    if (!isNonWorking) {
      workingDays++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return workingDays;
};

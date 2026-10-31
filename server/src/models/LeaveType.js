import mongoose from "mongoose";

const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    yearlyAllowance: {
      type: Number,
      required: true,
      default: 0,
    },
    carryOverLimit: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: "#3b82f6",
      trim: true,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);

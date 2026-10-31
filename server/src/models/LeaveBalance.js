import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    allocated: {
      type: Number,
      default: 0,
      min: 0,
    },
    used: {
      type: Number,
      default: 0,
      min: 0,
    },
    pending: {
      type: Number,
      default: 0,
      min: 0,
    },
    carriedOver: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

leaveBalanceSchema.index(
  { userId: 1, leaveTypeId: 1, year: 1 },
  { unique: true }
);

export const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);

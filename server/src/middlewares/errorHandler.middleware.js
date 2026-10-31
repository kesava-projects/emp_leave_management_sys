export const errorHandler = (err, req, res, _next) => {
  const statusCode =
    err.statusCode ||
    (err.code === "VALIDATION_ERROR"
      ? 400
      : err.code === "NOT_FOUND"
      ? 404
      : err.code === "UNAUTHORIZED"
      ? 401
      : err.code === "FORBIDDEN"
      ? 403
      : err.code === "INSUFFICIENT_BALANCE" ||
        err.code === "OVERLAPPING_REQUEST" ||
        err.code === "INVALID_STATUS" ||
        err.code === "INVALID_DATE_RANGE" ||
        err.code === "PAST_DATE_NOT_ALLOWED" ||
        err.code === "NO_WORKING_DAYS" ||
        err.code === "SELF_APPROVAL_NOT_ALLOWED" ||
        err.code === "COMMENT_REQUIRED" ||
        err.code === "CANNOT_CANCEL_NON_PENDING"
      ? 400
      : 500);

  const errorCode = err.code || "INTERNAL_SERVER_ERROR";
  const errorMessage = err.message || "An unexpected error occurred";

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: errorMessage,
      ...(process.env.NODE_ENV !== "production" && err.details ? { details: err.details } : {}),
    },
  });
};

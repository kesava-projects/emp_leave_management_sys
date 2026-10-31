export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[property]);
      req[property] = parsed;
      next();
    } catch (err) {
      const details = err.errors ? err.errors.map((e) => ({ path: e.path.join("."), message: e.message })) : [];
      const firstMessage = details[0]?.message || "Validation failed";
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: firstMessage,
          details,
        },
      });
    }
  };
};

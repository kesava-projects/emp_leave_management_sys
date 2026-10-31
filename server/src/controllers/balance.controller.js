import { getUserBalances } from "../services/balance.service.js";

export const getMyBalances = async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getUTCFullYear();
    const balances = await getUserBalances(req.user._id, year);
    return res.status(200).json({ balances });
  } catch (err) {
    next(err);
  }
};

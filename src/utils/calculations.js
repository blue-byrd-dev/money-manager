import { ENTRY_TYPES } from "../constants/entryTypes";

export const calculateTotals = (entries) => {
  const totalExpenses = entries
    .filter((entry) => entry.type === ENTRY_TYPES.EXPENSE)
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalDonations = entries
    .filter((entry) => entry.type === ENTRY_TYPES.DONATION)
    .reduce((sum, entry) => sum + entry.amount, 0);

  return { totalExpenses, totalDonations };
};

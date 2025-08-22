import { ENTRY_TYPES } from "../../constants/entryTypes";

export const EntryTypeBadge = ({ type }) => {
  const isExpense = type === ENTRY_TYPES.EXPENSE;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isExpense ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
      }`}
    >
      {isExpense ? "Expense" : "Donation"}
    </span>
  );
};

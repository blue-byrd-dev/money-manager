import { EntryTypeBadge } from "../ui/EntryTypeBadge";

export const EntryRow = ({ entry, onEdit, onDelete }) => (
  <tr className="hover:bg-gray-50">
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {new Date(entry.date).toLocaleDateString()}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <EntryTypeBadge type={entry.type} />
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
      ${entry.amount.toFixed(2)}
    </td>
    <td className="px-6 py-4 text-sm text-gray-900">{entry.description}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {entry.category || "-"}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {entry.vendor || "-"}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(entry)}
          className="text-blue-600 hover:text-blue-800 px-2 py-1"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-red-600 hover:text-red-800 px-2 py-1"
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);

import { EntryRow } from "./EntryRow";

export const EntriesTable = ({ entries, onEdit, onDelete }) => {
  const tableHeaders = [
    "Date",
    "Type",
    "Amount",
    "Description",
    "Category",
    "Vendor",
    "Actions",
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Recent Entries</h2>
      </div>

      {entries.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No entries yet
          </h3>
          <p className="text-gray-500">
            Get started by adding your first expense or donation
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {tableHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

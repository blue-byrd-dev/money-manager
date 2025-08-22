import { Plus, Download, Camera } from "lucide-react";
import { SummaryCard } from "../ui/SummaryCard";

export const Header = ({
  totalExpenses,
  totalDonations,
  totalEntries,
  onAddNew,
  onScanReceipt,
  onExport,
}) => {
  const summaryData = [
    {
      icon: ({ className }) => <span className={className}>💰</span>,
      title: "Total Expenses",
      value: totalExpenses,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      valueColor: "text-blue-900",
      isCurrency: true,
    },
    {
      icon: ({ className }) => <span className={className}>❤️</span>,
      title: "Total Donations",
      value: totalDonations,
      bgColor: "bg-green-50",
      textColor: "text-green-600",
      valueColor: "text-green-900",
      isCurrency: true,
    },
    {
      icon: ({ className }) => <span className={className}>📄</span>,
      title: "Total Entries",
      value: totalEntries,
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      valueColor: "text-purple-900",
      isCurrency: false, // This one is just a count
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Business Money Manager
      </h1>
      <p className="text-gray-600 mb-4">
        Keep track of your business expenses and donations in one simple place
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {summaryData.map((item, index) => (
          <SummaryCard key={index} {...item} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Entry
        </button>
        <button
          onClick={onScanReceipt}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-800 flex items-center gap-2 transition-colors"
        >
          <Camera className="h-4 w-4" />
          Scan Receipt
        </button>
        <button
          onClick={onExport}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
          disabled={totalEntries === 0}
        >
          <Download className="h-4 w-4" />
          Export to CSV
        </button>
      </div>
    </div>
  );
};

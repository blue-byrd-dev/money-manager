import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { calculateTotals } from "./utils/calculations";
import { exportToCSV } from "./utils/dataExport";
import { ENTRY_TYPES } from "./constants/entryTypes";
import { Header } from "./components/layout/Header";
import { EntryForm } from "./components/forms/EntryForm";
import { EntriesTable } from "./components/tables/EntriesTable";
import { ReceiptScanner } from "./components/forms/ReceiptScanner";

const MoneyManager = () => {
  const [entries, setEntries] = useLocalStorage('moneyManagerEntries', []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentEntry, setCurrentEntry] = useState({
    type: ENTRY_TYPES.EXPENSE,
    date: new Date().toISOString().split("T")[0],
    amount: "",
    category: "",
    description: "",
    vendor: "",
    notes: "",
  });
  const [showScanner, setShowScanner] = useState(false);

  const { totalExpenses, totalDonations } = calculateTotals(entries);

  const resetForm = () => {
    setCurrentEntry({
      type: ENTRY_TYPES.EXPENSE,
      date: new Date().toISOString().split("T")[0],
      amount: "",
      category: "",
      description: "",
      vendor: "",
      notes: "",
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!currentEntry.amount || !currentEntry.description) {
      alert("Please fill in amount and description");
      return;
    }

    const entryWithId = {
      ...currentEntry,
      id: editingId || Date.now(),
      amount: parseFloat(currentEntry.amount),
    };

    if (editingId) {
      setEntries(
        entries.map((entry) => (entry.id === editingId ? entryWithId : entry))
      );
    } else {
      setEntries([entryWithId, ...entries]);
    }

    resetForm();
  };

  const handleEdit = (entry) => {
    setCurrentEntry({
      ...entry,
      date: entry.date || new Date().toISOString().split("T")[0],
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      setEntries(entries.filter((entry) => entry.id !== id));
    }
  };

  const handleExport = () => {
    exportToCSV(entries);
  };

  const handleScanComplete = (scannedData) => {
    setCurrentEntry({
      type: ENTRY_TYPES.EXPENSE,
      date: scannedData.date,
      amount: scannedData.amount,
      category: scannedData.category,
      description: scannedData.description,
      vendor: scannedData.vendor,
      notes: scannedData.notes,
    });
    setShowScanner(false);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Header
          totalExpenses={totalExpenses}
          totalDonations={totalDonations}
          totalEntries={entries.length}
          onAddNew={() => setShowForm(true)}
          onScanReceipt={() => setShowScanner(true)} // Add this prop
          onExport={handleExport}
        />

        {showScanner && (
          <ReceiptScanner
            onScanComplete={handleScanComplete}
            onClose={() => setShowScanner(false)}
          />
        )}

        {showForm && (
          <EntryForm
            currentEntry={currentEntry}
            onEntryChange={setCurrentEntry}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            editingId={editingId}
          />
        )}

        <EntriesTable
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default MoneyManager;

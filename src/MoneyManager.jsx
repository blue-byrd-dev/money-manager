import React, { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { calculateTotals } from "./utils/calculations";
import { exportToCSV } from "./utils/dataExport";
import { ENTRY_TYPES } from "./constants/entryTypes";
import { Header } from "./components/layout/Header";
import { EntryForm } from "./components/forms/EntryForm";
import { EntriesTable } from "./components/tables/EntriesTable";

const MoneyManager = () => {
  const [entries, setEntries] = useLocalStorage("businessEntries", []);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Header
          totalExpenses={totalExpenses}
          totalDonations={totalDonations}
          totalEntries={entries.length}
          onAddNew={() => setShowForm(true)}
          onExport={handleExport}
        />

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

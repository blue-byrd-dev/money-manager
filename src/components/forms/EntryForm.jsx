import { X } from "lucide-react";
import { FormField } from "../ui/FormField";
import { ENTRY_TYPE_OPTIONS } from "../../constants/entryTypes";

export const EntryForm = ({
  currentEntry,
  onEntryChange,
  onSubmit,
  onCancel,
  editingId,
}) => {
  const handleFieldChange = (field, value) => {
    onEntryChange({ 
      ...currentEntry, 
      [field]: field === "amount" ? parseFloat(value) || 0 : value });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {editingId ? "Edit Entry" : "Add New Entry"}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Type"
          value={currentEntry.type}
          onChange={(e) => handleFieldChange("type", e.target.value)}
          required
          options={ENTRY_TYPE_OPTIONS}
        />

        <FormField
          label="Date"
          type="date"
          value={currentEntry.date}
          onChange={(e) => handleFieldChange("date", e.target.value)}
          required
        />

        <FormField
          label="Amount ($)"
          type="number"
          value={currentEntry.amount}
          onChange={(e) => handleFieldChange("amount", e.target.value)}
          required
          placeholder="0.00"
          step="0.01"
          min="0"
        />

        <FormField
          label="Category"
          value={currentEntry.category}
          onChange={(e) => handleFieldChange("category", e.target.value)}
          placeholder="Office supplies, Travel, etc."
        />

        <div className="md:col-span-2">
          <FormField
            label="Description"
            value={currentEntry.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            required
            placeholder="Brief description of the expense or donation"
          />
        </div>

        <FormField
          label="Vendor/Organization"
          value={currentEntry.vendor}
          onChange={(e) => handleFieldChange("vendor", e.target.value)}
          placeholder="Store name, charity name, etc."
        />

        <FormField
          label="Notes"
          value={currentEntry.notes}
          onChange={(e) => handleFieldChange("notes", e.target.value)}
          placeholder="Additional notes (optional)"
        />

        <div className="md:col-span-2 flex gap-3">
          <button
            onClick={onSubmit}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {editingId ? "Update Entry" : "Save Entry"}
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

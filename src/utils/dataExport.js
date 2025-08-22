export const exportToCSV = (entries) => {
  const headers = [
    "Date",
    "Type",
    "Amount",
    "Category",
    "Description",
    "Vendor",
    "Notes",
  ];
  const csvContent = [
    headers.join(","),
    ...entries.map((entry) =>
      [
        entry.date,
        entry.type,
        entry.amount,
        entry.category,
        entry.description,
        entry.vendor || "",
        entry.notes || "",
      ]
        .map((field) => `"${field}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `business-records-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const FormField = ({
  label,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder = "",
  options = null,
  ...props
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && "*"}
    </label>
    {options ? (
      <select
        value={value}
        onChange={onChange}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required={required}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
        required={required}
        {...props}
      />
    )}
  </div>
);

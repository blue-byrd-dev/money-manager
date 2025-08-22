export const SummaryCard = ({
  icon,
  title,
  value,
  bgColor,
  textColor,
  valueColor,
  isCurrency = true,
}) => {
  const IconComponent = icon;

  return (
    <div className={`${bgColor} p-4 rounded-lg`}>
      <div className="flex items-center">
        <IconComponent className={`h-8 w-8 ${textColor} mr-3`} />
        <div>
          <p className={`text-sm ${textColor}`}>{title}</p>
          <p className={`text-2xl font-bold ${valueColor}`}>
            {isCurrency ? `$${value.toFixed(2)}` : value}
          </p>
        </div>
      </div>
    </div>
  );
};

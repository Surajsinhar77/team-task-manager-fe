import React from 'react';

function StatCard({ title, value, bgColor, textColor }) {
  return (
    <div className={`${bgColor} rounded-lg p-6 border border-gray-200`}>
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className={`text-3xl font-bold ${textColor} mt-2`}>{value}</p>
    </div>
  );
}

export default StatCard;

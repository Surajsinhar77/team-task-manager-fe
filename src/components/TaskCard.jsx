import React from 'react';

function TaskCard({ task }) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  const formatLabel = (value) => {
    if (!value) {
      return '';
    }

    return String(value)
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white">
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-semibold text-gray-900 flex-1 ${isOverdue ? 'text-red-600' : ''}`}>
          {task.title}
          {isOverdue && <span className="text-xs text-red-600 ml-2">(Overdue)</span>}
        </h3>
      </div>

      {task.description && (
        <p className="text-gray-600 text-sm mb-3">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
          {formatLabel(task.priority)}
        </span>
        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
          {formatLabel(task.status)}
        </span>
        {task.dueDate && (
          <span className="text-xs text-gray-600">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default TaskCard;

import React from 'react';

function TaskColumn({
  title,
  tasks,
  color,
  borderColor,
  onStatusChange,
  onDelete,
  statusOptions = [],
  user,
  isUpdating,
}) {
  const userId = user?.id || user?._id;

  const canEdit = (task) => {
    const assignedUserId =
      task?.assignedTo?.id || task?.assignedTo?._id || task?.assignedTo;
    const roles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
    const isAdmin = roles.includes('ORG_ADMIN') || roles.includes('Admin');

    return isAdmin || assignedUserId === userId;
  };

  const formatPriority = (priority) => {
    if (!priority) {
      return 'Medium';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const formatStatus = (status) =>
    String(status || '')
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  return (
    <div className={`${color} rounded-lg border ${borderColor} p-4 min-h-96`}>
      <div className="mb-4">
        <h2 className="font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{tasks.length} tasks</p>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 flex-1 text-sm">
                {task.title}
              </h3>
              {canEdit(task) && typeof onDelete === 'function' && (
                <button
                  onClick={() => onDelete(task._id)}
                  className="text-red-500 hover:text-red-700 text-xs ml-2"
                >
                  ✕
                </button>
              )}
            </div>

            {task.description && (
              <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                {formatPriority(task.priority)}
              </span>
              <span className="text-xs bg-white text-gray-700 px-2 py-1 rounded border border-gray-200">
                {formatStatus(task.status)}
              </span>
              {task.dueDate && (
                <span className="text-xs text-gray-600">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>

            {canEdit(task) && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Update Status
                </label>
                <select
                  value={task.status}
                  disabled={isUpdating}
                  onChange={(e) => {
                    if (e.target.value !== task.status) {
                      onStatusChange(task._id, e.target.value);
                    }
                  }}
                  className="w-full bg-white text-xs py-2 px-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  {statusOptions.map((statusOption) => (
                    <option key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}

        {tasks.length === 0 && (
          <p className="text-gray-500 text-center text-sm py-8">No tasks</p>
        )}
      </div>
    </div>
  );
}

export default TaskColumn;

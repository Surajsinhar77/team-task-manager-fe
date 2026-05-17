import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function Navbar({ onLogout }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => navigate('/')}
            className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition"
          >
            TaskFlow
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-gray-700 hover:text-blue-600 transition font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="text-gray-700 hover:text-blue-600 transition font-medium"
            >
              Projects
            </button>

            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
              <span className="text-gray-700 font-medium">{user?.name}</span>
              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

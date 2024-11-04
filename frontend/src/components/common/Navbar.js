// Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Navbar = ({ user, setAuth }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-white text-lg font-semibold">
                Tourism Chatbot
              </span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              {user.is_admin && (
                <Link
                  to="/admin"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Cog6ToothIcon className="h-5 w-5 mr-1" />
                  Admin
                </Link>
              )}
              <Link
                to="/chat"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-1" />
                Chat
              </Link>
              <div className="relative group">
                <button className="flex items-center text-gray-300 hover:text-white">
                  <UserCircleIcon className="h-8 w-8" />
                  <span className="ml-2">{user.username}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  PlusIcon,
  ChatBubbleLeftIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

const ChatHistory = ({ currentChatId }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, [currentChatId]);

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/chat/chats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setChats(response.data.chats);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this chat?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/chat/chat/${chatId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setChats(chats.filter(chat => chat.id !== chatId));
      if (chatId === currentChatId) {
        navigate('/chat');
      }
      toast.success('Chat deleted successfully');
    } catch (error) {
      toast.error('Error deleting chat');
    }
  };


  // frontend/src/components/Chat/ChatHistory.js

return (
  <div className="flex flex-col h-full bg-gray-800 text-white">
    {/* New Chat Button */}
    <div className="p-4">
      <Link
        to="/chat"
        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2"
      >
        <PlusIcon className="h-5 w-5" />
        <span>New Chat</span>
      </Link>
    </div>

    {/* Chat List - Make it scrollable and fill remaining height */}
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : chats.length === 0 ? (
        <div className="text-center py-4 text-gray-400">No chats yet</div>
      ) : (
        <nav className="space-y-1 px-2">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              to={`/chat/${chat.id}`}
              className={`flex items-center justify-between group px-2 py-2 text-sm rounded-md ${
                currentChatId === chat.id.toString()
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="flex items-center">
                <ChatBubbleLeftIcon className="mr-3 h-5 w-5" />
                <span className="truncate">{chat.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-500"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Link>
          ))}
        </nav>
      )}
    </div>
  </div>
);
};

export default ChatHistory;
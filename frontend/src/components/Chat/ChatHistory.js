// ChatHistory.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { ChatBubbleLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import Loading from '../common/loading';

const ChatHistory = ({ currentChatId, onLogout }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchChats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        navigate('/login');
        return;
      }

      // Note the /api/chat prefix in the URL
      console.log('Fetching chats from:', `${process.env.REACT_APP_API_URL}/api/chat/chats`);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/chat/chats`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Chats response:', response.data);

      if (response.data && response.data.chats) {
        const sortedChats = response.data.chats.sort((a, b) => {
          const dateA = new Date(b.updated_at || b.created_at);
          const dateB = new Date(a.updated_at || a.created_at);
          return dateA - dateB;
        });
        
        console.log('Sorted chats:', sortedChats);
        setChats(sortedChats);
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });

      if (error.message.includes('Network Error')) {
        toast.error('Unable to connect to server. Please check your connection.');
      } else if (error.response?.status === 401) {
        if (onLogout) {
          onLogout();
        } else {
          navigate('/login');
        }
      } else {
        toast.error('Error loading chat history');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, onLogout]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

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
      
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      if (chatId.toString() === currentChatId) {
        navigate('/chat');
      }
      
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      if (error.response?.status === 401) {
        if (onLogout) {
          onLogout();
        } else {
          navigate('/login');
        }
      } else {
        toast.error('Error deleting chat');
      }
    }
  };

  return (
    <nav className="space-y-1">
      {loading ? (
        <div className="text-center py-4">
          <Loading size="small" />
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No conversations yet
        </div>
      ) : (
        chats.map((chat) => (
          <Link
            key={chat.id}
            to={`/chat/${chat.id}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
              currentChatId === chat.id.toString()
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ChatBubbleLeftIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate flex-1">
              {chat.title || 'New Conversation'}
            </span>
            <button
              onClick={(e) => handleDeleteChat(chat.id, e)}
              className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
              title="Delete chat"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </Link>
        ))
      )}
    </nav>
  );
};

export default ChatHistory;
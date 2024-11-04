// ChatWindow.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  PlusIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import ChatHistory from './ChatHistory';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import Loading from '../common/Loading';

const ChatWindow = ({ user, setAuth }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [typingEffect, setTypingEffect] = useState(false);
  const messagesEndRef = useRef(null);
  const { chatId } = useParams();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setAuth(null);
    navigate('/login');
    toast.success('Signed out successfully');
  }, [navigate, setAuth]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    setMessageLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching messages for chat:', chatId);
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/chat/chat/${chatId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Messages response:', response.data);
      
      if (response.data.chat && response.data.chat.messages) {
        setMessages(response.data.chat.messages);
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.message.includes('Network Error')) {
        toast.error('Unable to connect to server. Please check your connection.');
      } else if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error('Error fetching messages');
      }
    } finally {
      setMessageLoading(false);
    }
  }, [chatId, handleLogout]);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [chatId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingEffect, scrollToBottom]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;
  
    setLoading(true);
    let currentChatId = chatId;
  
    try {
      const token = localStorage.getItem('token');
      console.log('Sending message:', inputMessage);
  
      // Create new chat if none exists
      if (!currentChatId) {
        console.log('Creating new chat...');
        const chatResponse = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/chat/chat`,
          { title: inputMessage.slice(0, 50) + '...' },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('New chat response:', chatResponse.data);
        currentChatId = chatResponse.data.chat.id;
        navigate(`/chat/${currentChatId}`);
      }
  
      // Add user message immediately
      const userMessage = {
        id: Date.now(),
        content: inputMessage,
        role: 'user',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setTypingEffect(true);
      scrollToBottom();
  
      // Send message to server
      console.log('Sending message to server...');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chat/chat/${currentChatId}/messages`,
        { message: inputMessage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('Message response:', response.data);
  
      // Add assistant response
      if (response.data.response) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: response.data.response.id,
            content: response.data.response.content,
            role: 'assistant',
            created_at: response.data.response.created_at
          }]);
          setTypingEffect(false);
          scrollToBottom();
        }, 500);
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.message.includes('Network Error')) {
        toast.error('Unable to connect to server. Please check your connection.');
      } else if (error.response?.status === 401) {
        handleLogout();
      } else {
        toast.error('Error sending message');
      }
    } finally {
      setLoading(false);
    }
  }, [inputMessage, loading, chatId, navigate, scrollToBottom, handleLogout]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-semibold text-gray-900">
              Tourism Chat
            </span>
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={() => {
              setMessages([]);
              setInputMessage('');
              navigate('/chat');
            }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 px-4 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Chat History
            </h2>
            <ChatHistory currentChatId={chatId} onLogout={handleLogout} />
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* User Info */}
          <div className="flex items-center p-2 rounded-lg">
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {user?.username}
            </span>
          </div>

          {/* Admin Link */}
          {user?.is_admin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              <span className="text-sm">Admin Dashboard</span>
            </Link>
          )}

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messageLoading ? (
              <div className="flex justify-center py-10">
                <Loading size="medium" />
              </div>
            ) : messages.length === 0 ? (
              <WelcomeScreen onExampleClick={(example) => setInputMessage(example)} />
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={index === messages.length - 1}
                  />
                ))}
                {typingEffect && (
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <div className="typing-dots">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
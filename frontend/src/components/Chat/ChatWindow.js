import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import io from 'socket.io-client';
import { PlusIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { PaperAirplaneIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import ChatHistory from './ChatHistory';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingEffect, setTypingEffect] = useState(false);
  const messagesEndRef = useRef(null);
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [processingProgress, setProcessingProgress] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Socket.IO connection
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);
    
    socket.on('processing_progress', (data) => {
      setProcessingProgress(data);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingEffect]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/chat/chat/${chatId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(response.data.chat.messages);
    } catch (error) {
      toast.error('Error fetching messages');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    let currentChatId = chatId;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Create new chat if none exists
      if (!currentChatId) {
        const chatResponse = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/chat/chat`,
          { title: inputMessage },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
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

      // Show typing effect
      setTypingEffect(true);
      scrollToBottom();

      // Send message to API
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chat/chat/${currentChatId}/messages`,
        { message: inputMessage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Add assistant response with typing effect
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

    } catch (error) {
      toast.error('Error sending message');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    setInputMessage(example);
    // Optional: auto-submit the example
    handleSubmit(new Event('submit'), example);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Fixed height with scroll */}
      <div className="w-64 bg-gray-800 flex flex-col h-screen">
        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => navigate('/chat')}
            className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-3 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <ChatHistory currentChatId={chatId} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen bg-gray-50">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen onExampleClick={handleExampleClick} />
          ) : (
            <div className="space-y-6 p-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}
              {typingEffect && (
                <div className="flex items-center space-x-2">
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Fixed Input Area */}
        <div className="border-t bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={loading || typingEffect}
                placeholder="Ask about Sri Lankan tourism..."
                className="flex-1 rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || typingEffect || !inputMessage.trim()}
                className={`p-3 rounded-lg ${
                  loading || typingEffect || !inputMessage.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                <PaperAirplaneIcon className="h-5 w-5 text-white" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

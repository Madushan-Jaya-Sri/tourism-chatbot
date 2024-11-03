// frontend/src/components/Chat/ChatWindow.js

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import ChatHistory from './ChatHistory';
import MessageBubble from './MessageBubble';
import Loading from '../common/loading';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingEffect, setTypingEffect] = useState(false);
  const messagesEndRef = useRef(null);
  const { chatId } = useParams();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

      // Send message to API
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chat/chat/${currentChatId}/messages`,
        { message: inputMessage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Add assistant response with typing effect
      setTypingEffect(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: response.data.response.id,
          content: response.data.response.content,
          role: 'assistant',
          created_at: response.data.response.created_at
        }]);
        setTypingEffect(false);
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

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatHistory currentChatId={chatId} />
      
      <div className="flex flex-col flex-1">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))}
          {typingEffect && (
            <div className="flex items-center space-x-2 text-gray-500 p-4">
              <Loading size="small" />
              <span>Tourism Assistant is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t bg-white p-4 flex items-center space-x-4"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading || typingEffect}
            placeholder="Ask about Sri Lankan tourism..."
            className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || typingEffect || !inputMessage.trim()}
            className={`p-2 rounded-lg ${
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
  );
};

export default ChatWindow;
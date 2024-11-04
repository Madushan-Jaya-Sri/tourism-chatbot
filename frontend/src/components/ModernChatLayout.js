import React, { useState } from 'react';
import { PlusIcon, SearchIcon, Settings2 } from 'lucide-react';

const ModernChatLayout = () => {
  const [conversations, setConversations] = useState([
    { id: 1, title: "Create Html Game Environment..." },
    { id: 2, title: "Apply To Leave For Emergency" },
    { id: 3, title: "What is UI UX Design?" },
    { id: 4, title: "Create POS System" },
    { id: 5, title: "What is UX Audit?" },
    { id: 6, title: "Create Chatbot GPT..." },
    { id: 7, title: "How Chat GPT Work?" }
  ]);

  const [currentUser] = useState({
    name: "Andrew Neilson",
    avatar: "/api/placeholder/32/32"
  });

  return (
    <div className="flex h-screen bg-[#f5f7fb]">
      {/* Sidebar */}
      <div className="w-[280px] bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold mb-4">CHAT A.I+</h1>
          {/* New Chat Button */}
          <div className="flex gap-2">
            <button className="flex-1 bg-[#4F46E5] text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2">
              <PlusIcon className="w-4 h-4" />
              <span>New chat</span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <SearchIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex justify-between items-center px-2 py-3">
              <span className="text-sm text-gray-500">Your conversations</span>
              <button className="text-sm text-[#4F46E5]">Clear All</button>
            </div>
            {conversations.map((chat) => (
              <button
                key={chat.id}
                className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-3"
              >
                <span className="text-sm text-gray-700">{chat.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full"
            />
            <span className="flex-1 text-sm font-medium">{currentUser.name}</span>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Settings2 className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <ChatMessage
            role="assistant"
            content="Sure, I can help you get started with creating a chatbot using GPT in Python. Here are the basic steps you'll need to follow:"
          />
          <ChatSteps
            steps={[
              "Install the required libraries: You'll need to install the transformers library from Hugging Face to use GPT. You can install it using pip.",
              "Load the pre-trained model: GPT comes in several sizes and versions, so you'll need to choose the one that fits your needs. You can load a pre-trained GPT model. This loads the 1.3B parameter version of GPT-Neo, which is a powerful and relatively recent model.",
              "Create a chatbot loop: You'll need to create a loop that takes user input, generates a response using the GPT model, and outputs it to the user. Here's an example loop that uses the input() function to get user input and the gpt() function to generate a response. This loop will keep running until the user exits the program or the loop is interrupted.",
              "Add some personality to the chatbot: While GPT can generate text, it doesn't have any inherent personality or style. You can make your chatbot more interesting by adding custom prompts or responses that reflect your desired personality. You can then modify the chatbot loop to use these prompts and responses when appropriate. This will make the chatbot seem more human-like and engaging."
            ]}
          />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="What's in your mind..."
                className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent pr-12"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-[#4F46E5] text-white rounded-full">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ChatMessage Component
const ChatMessage = ({ role, content }) => {
  return (
    <div className={`flex gap-4 mb-6 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${role === 'user' ? 'bg-[#4F46E5] text-white' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
        <p className="text-sm">{content}</p>
      </div>
    </div>
  );
};

// ChatSteps Component
const ChatSteps = ({ steps }) => {
  return (
    <div className="space-y-4 mb-6">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-sm">
            {index + 1}
          </div>
          <p className="flex-1 text-sm">{step}</p>
        </div>
      ))}
    </div>
  );
};

export default ModernChatLayout;


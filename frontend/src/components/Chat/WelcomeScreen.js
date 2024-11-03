import React from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { CheckIcon } from '@heroicons/react/24/outline';

const WelcomeScreen = ({ onExampleClick }) => {
  const examples = [
    "Tell me about tourist attractions in Sri Lanka",
    "What are the best beaches in Sri Lanka?",
    "Recommend a 3-day itinerary for Kandy"
  ];

  const capabilities = [
    "Comprehensive tourism information",
    "Personalized travel recommendations",
    "Historical and cultural insights",
    "Interactive travel planning"
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-center mb-8">
        <img 
          src="/logo.jpeg" // Make sure to add your logo in public folder
          alt="Sri Lanka Tourism"
          className="h-24 w-auto"
        />
      </div>

      <h1 className="text-3xl font-bold text-center mb-12">
        Welcome to Tourism Assistant
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Examples Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Try These Examples</h2>
          <div className="space-y-4">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => onExampleClick(example)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                <span>{example}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Capabilities</h2>
          <div className="space-y-4">
            {capabilities.map((capability, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-2"
              >
                <CheckIcon className="h-5 w-5 text-green-500" />
                <span>{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
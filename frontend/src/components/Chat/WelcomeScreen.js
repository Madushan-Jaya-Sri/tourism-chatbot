import React from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { CheckIcon } from '@heroicons/react/24/outline';

const WelcomeScreen = ({ onExampleClick }) => {
  const examples = [
    "What is the overall trend in tourist arrivals in Sri Lanka, for the last 5 years?",
    "What are the best investment opportunities in the Sri Lankan tourism sector?",
    "Currently, what are the top-performing hotel companies in Sri Lanka? "
  ];

  const capabilities = [
    "Comprehensive tourism information",
    "Personalized travel recommendations",
    "Historical and cultural insights",
    "Interactive travel planning"
  ];

  const handleExampleClick = (example) => {
    if (onExampleClick) {
      onExampleClick(example);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-center mb-8">
        <img 
          src="/logo.jpeg"
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
                onClick={() => handleExampleClick(example)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center group"
              >
                <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 mr-3 transition-colors" />
                <span className="group-hover:text-indigo-600 transition-colors">{example}</span>
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckIcon className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-gray-700">{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
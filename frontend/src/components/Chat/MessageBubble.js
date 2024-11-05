import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const ChartComponent = ({ chartData }) => {
  if (!chartData?.type || !chartData?.data) return null;

  const renderChart = () => {
    switch (chartData.type.toLowerCase()) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartData.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={chartData.yKey || 'value'} stroke="#4F46E5" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartData.xKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chartData.yKey || 'value'} fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.data}
                nameKey={chartData.nameKey || 'name'}
                dataKey={chartData.valueKey || 'value'}
                fill="#4F46E5"
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="my-4 bg-white rounded-lg shadow-sm">
      {renderChart()}
    </div>
  );
};

const MessageSection = ({ title, content, isChart = false, chartData = null }) => {
  if (!content && !chartData) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-indigo-600 mb-2">{title}</h3>
      <div className="text-sm text-gray-700">
        {isChart ? (
          <ChartComponent chartData={chartData} />
        ) : (
          <ReactMarkdown>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, isLast }) => {
  const isUser = message.role === 'user';
  const [sections, setSections] = useState({
    summary: '',
    details: '',
    statistics: null,
    commentary: ''
  });

  useEffect(() => {
    if (!isUser && message.content) {
      // Extract sections
      const sectionRegex = {
        summary: /Summary:\s*([\s\S]*?)(?=Details:|$)/,
        details: /Details:\s*([\s\S]*?)(?=Statistics:|$)/,
        statistics: /Statistics:\s*([\s\S]*?)(?=Commentary:|$)/,
        commentary: /Commentary:\s*([\s\S]*?)$/
      };

      const extractedSections = {};
      Object.entries(sectionRegex).forEach(([key, regex]) => {
        const match = message.content.match(regex);
        extractedSections[key] = match?.[1]?.trim() || '';
      });

      // Parse chart data if present
      if (extractedSections.statistics) {
        const codeMatch = extractedSections.statistics.match(/```([\s\S]*?)```/);
        if (codeMatch) {
          try {
            extractedSections.statistics = JSON.parse(codeMatch[1]);
          } catch (error) {
            console.error('Error parsing chart data:', error);
            extractedSections.statistics = null;
          }
        }
      }

      setSections(extractedSections);
    }
  }, [message.content, isUser]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`${
        isUser 
          ? 'bg-indigo-600 text-white ml-auto' 
          : 'bg-white border border-gray-200'
        } rounded-lg shadow-sm ${
          isUser ? 'max-w-[70%]' : 'max-w-[85%]'
        } overflow-hidden`}
      >
        <div className="p-4">
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="space-y-4">
              <MessageSection title="Summary" content={sections.summary} />
              <MessageSection title="Details" content={sections.details} />
              <MessageSection 
                title="Statistics" 
                isChart={true} 
                chartData={sections.statistics} 
              />
              <MessageSection title="Commentary" content={sections.commentary} />
            </div>
          )}
        </div>
        <div className={`px-4 py-2 text-xs ${
          isUser ? 'text-indigo-200' : 'text-gray-500'
        } border-t ${
          isUser ? 'border-indigo-500' : 'border-gray-100'
        }`}>
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
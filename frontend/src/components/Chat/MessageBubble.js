import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#4F46E5', '#818CF8', '#6366F1', '#4338CA', '#3730A3'];

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
              <Line 
                type="monotone" 
                dataKey={chartData.yKey || 'value'} 
                stroke="#4F46E5"
                strokeWidth={2}
              />
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
              <Bar 
                dataKey={chartData.yKey || 'value'} 
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
              />
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
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {chartData.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
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
    <div className="my-4 p-4 bg-gray-50 rounded-lg">
      {renderChart()}
    </div>
  );
};

const MessageSection = ({ title, content, isChart = false, chartData = null }) => {
  if (!content && !chartData) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-indigo-600 mb-2">{title}</h3>
      <div className={`${isChart ? '' : 'prose prose-sm max-w-none text-gray-700'}`}>
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
      // Extract sections with improved regex
      const sectionsData = {};
      const content = message.content;

      // Extract each section
      const summaryMatch = content.match(/Summary:([\s\S]*?)(?=Details:|$)/);
      const detailsMatch = content.match(/Details:([\s\S]*?)(?=Statistics:|$)/);
      const statisticsMatch = content.match(/Statistics:([\s\S]*?)(?=Commentary:|$)/);
      const commentaryMatch = content.match(/Commentary:([\s\S]*?)$/);

      sectionsData.summary = summaryMatch ? summaryMatch[1].trim() : '';
      sectionsData.details = detailsMatch ? detailsMatch[1].trim() : '';
      sectionsData.commentary = commentaryMatch ? commentaryMatch[1].trim() : '';

      // Parse statistics JSON if present
      if (statisticsMatch) {
        const jsonMatch = statisticsMatch[1].match(/```([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            sectionsData.statistics = JSON.parse(jsonMatch[1].trim());
          } catch (error) {
            console.error('Error parsing chart data:', error);
            sectionsData.statistics = null;
          }
        }
      }

      setSections(sectionsData);
    }
  }, [message.content, isUser]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`${
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
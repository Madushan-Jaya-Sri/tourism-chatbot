// frontend/src/components/Admin/FileUpload.js

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import io from 'socket.io-client';
import { CloudArrowUpIcon, DocumentIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Socket.IO connection
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);
    
    socket.on('processing_progress', (data) => {
      setProcessingProgress(data);
      if (data.percentage === 100) {
        setTimeout(() => {
          setProcessingProgress(null);
          onUploadSuccess();
        }, 1000);
      }
    });

    return () => socket.disconnect();
  }, [onUploadSuccess]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setProcessingProgress(null); // Reset processing progress
      } else {
        toast.error('Please select a PDF file');
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setProcessingProgress(null);
      } else {
        toast.error('Please drop a PDF file');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setUploadProgress(0);
    setProcessingProgress(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setUploadProgress(progress);
          }
        }
      );

      // Don't clear file and show success message yet - wait for processing
      setProcessingProgress({ message: "Starting PDF processing...", percentage: 0 });
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error uploading file');
      setFile(null);
      fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage < 0) return 'bg-red-600';
    if (percentage < 50) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  return (
    <div className="max-w-xl">
      <form onSubmit={handleUpload}>
        <div 
          className="flex flex-col items-center justify-center w-full"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <label className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
            uploading || processingProgress 
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-500'
          }`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <CloudArrowUpIcon className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PDF files only</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={uploading || processingProgress}
            />
          </label>
        </div>

        {file && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DocumentIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">
                  {file.name}
                </span>
              </div>
              {!uploading && !processingProgress && (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:text-red-800"
                  onClick={() => {
                    setFile(null);
                    fileInputRef.current.value = '';
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        {(uploading || processingProgress) && (
          <div className="mt-6 space-y-4">
            {uploading && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Uploading file...</span>
                  <span className="text-gray-500">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {processingProgress && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{processingProgress.message}</span>
                  <span className="text-gray-500">{processingProgress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${getProgressColor(processingProgress.percentage)} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(processingProgress.percentage, 0)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading || processingProgress}
          className={`w-full mt-6 px-4 py-3 text-white font-medium rounded-lg transition-all duration-200 ${
            !file || uploading || processingProgress
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow'
          }`}
        >
          {uploading ? 'Uploading...' : 
           processingProgress ? 'Processing...' : 
           'Upload File'}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;
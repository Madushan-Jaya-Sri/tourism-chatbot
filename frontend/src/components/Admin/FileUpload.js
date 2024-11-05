import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const ProcessingSteps = ({ status, percentage }) => {
  const steps = [
    { id: 'upload', label: 'Uploading to Server', threshold: 25 },
    { id: 'extract', label: 'Extracting Text', threshold: 45 },
    { id: 'process', label: 'Processing Content', threshold: 65 },
    { id: 'embed', label: 'Creating Embeddings', threshold: 85 },
    { id: 'store', label: 'Storing in Database', threshold: 100 }
  ];

  const getCurrentStep = () => {
    if (status === 'error') return -1;
    if (status === 'completed') return steps.length - 1;
    return steps.findIndex(step => percentage <= step.threshold);
  };

  const currentStep = getCurrentStep();

  return (
    <div className="mt-4">
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = status === 'completed' || index < currentStep;
          const isActive = index === currentStep && status !== 'error' && status !== 'completed';
          const isError = status === 'error' && index === currentStep;
          
          return (
            <div 
              key={step.id}
              className={`flex items-center ${
                isError ? 'text-red-600' :
                isActive ? 'text-blue-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                {isCompleted ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                ) : isError ? (
                  <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
                ) : isActive ? (
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </div>
              <span className={`ml-4 text-sm ${
                isActive ? 'font-medium' :
                isCompleted ? 'text-gray-600' :
                isError ? 'text-red-600' :
                'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FileUpload = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState({});
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_API_URL);

    socketRef.current.on('document_progress', (data) => {
      setProcessingFiles(prev => ({
        ...prev,
        [data.document_id]: {
          status: data.status,
          message: data.message,
          percentage: data.percentage
        }
      }));

      if (data.status === 'completed' || data.status === 'error') {
        onUploadSuccess();
        
        // Remove from processing after a delay
        setTimeout(() => {
          setProcessingFiles(prev => {
            const newState = { ...prev };
            delete newState[data.document_id];
            return newState;
          });
        }, 3000);
      }
    });

    return () => socketRef.current?.disconnect();
  }, [onUploadSuccess]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (selectedFiles.length === 0) {
      toast.error('Please select PDF files only');
      return;
    }

    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (droppedFiles.length === 0) {
      toast.error('Please drop PDF files only');
      return;
    }

    setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    const token = localStorage.getItem('token');
    
    // Upload files concurrently
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/admin/upload`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        // Initialize processing status for the new document
        setProcessingFiles(prev => ({
          ...prev,
          [response.data.document.id]: {
            status: 'uploading',
            message: 'Starting upload...',
            percentage: 0
          }
        }));

        return response.data;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Error uploading ${file.name}: ${error.response?.data?.error || 'Unknown error'}`);
        throw error;
      }
    });

    try {
      await Promise.all(uploadPromises);
      toast.success('All files uploaded successfully');
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Individual file errors are handled in the upload promises
      console.error('Some files failed to upload:', error);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed rounded-lg p-6 hover:border-blue-500 cursor-pointer"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center">
          <CloudArrowUpIcon className="h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop your PDF files here, or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">
            Selected Files ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            className="w-full py-2 px-4 rounded-md text-white font-medium bg-blue-500 hover:bg-blue-600"
          >
            Upload {files.length} File{files.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {Object.entries(processingFiles).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Processing Status</h3>
          {Object.entries(processingFiles).map(([docId, status]) => (
            <div key={docId} className="bg-white shadow rounded-lg p-4">
              <ProcessingSteps 
                status={status.status} 
                percentage={status.percentage} 
              />
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {status.message}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {status.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div
                      style={{ width: `${Math.max(0, status.percentage)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        status.status === 'error' ? 'bg-red-500' :
                        status.status === 'completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  TrashIcon, 
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import FileUpload from './FileUpload';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/documents`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setDocuments(response.data.documents);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Unauthorized: Admin access required');
        navigate('/login');
      } else {
        toast.error('Error fetching documents');
        console.error('Error fetching documents:', error);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);

    socket.on('document_progress', (data) => {
      console.log('Progress update received:', data);
      setDocuments(prevDocs => {
        const docIndex = prevDocs.findIndex(doc => doc.id === data.document_id);
        if (docIndex === -1) {
          // If document not found, fetch all documents
          fetchDocuments();
          return prevDocs;
        }

        const updatedDocs = [...prevDocs];
        updatedDocs[docIndex] = {
          ...updatedDocs[docIndex],
          status: data.status,
          progress: data.percentage,
          processingMessage: data.message,
          error_message: data.status === 'error' ? data.message : updatedDocs[docIndex].error_message
        };
        return updatedDocs;
      });
    });

    fetchDocuments();


    return () => {
      socket.disconnect();
    };
  }, [fetchDocuments]);

  const handleRefresh = () => {
    if (!isRefreshing) {
      fetchDocuments();
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/admin/documents/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Document deleted successfully');
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      toast.error('Error deleting document');
      console.error('Error deleting document:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'uploading':
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getProgressPercentage = (doc) => {
    if (doc.status === 'completed') return 100;
    if (doc.status === 'error') return 0;
    return doc.progress || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/chat')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 
                ${isRefreshing ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <ArrowPathIcon className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Documents</h2>
          <FileUpload onUploadSuccess={fetchDocuments} />
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Uploaded Documents</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your uploaded PDF documents here
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <li key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.filename}
                        </p>
                        <p className="text-sm text-gray-500">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center mb-1">
                            {getStatusIcon(doc.status)}
                            <span className={`ml-2 text-sm ${getStatusColor(doc.status)}`}>
                              {doc.processingMessage || doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                doc.status === 'error' ? 'bg-red-500' :
                                doc.status === 'completed' ? 'bg-green-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${getProgressPercentage(doc)}%` }}
                            />
                          </div>
                        </div>
                        {doc.error_message && (
                          <p className="text-sm text-red-600 mt-1">{doc.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                        title="Delete document"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
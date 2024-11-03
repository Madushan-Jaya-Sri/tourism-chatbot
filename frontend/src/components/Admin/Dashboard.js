// frontend/src/components/Admin/Dashboard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import FileUpload from './FileUpload';
import { 
  TrashIcon, 
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
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
      }
    } finally {
      setLoading(false);
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
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <FileUpload onUploadSuccess={fetchDocuments} />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Uploaded Documents</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your uploaded PDF documents here
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No documents uploaded yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <DocumentIcon className="h-6 w-6 text-gray-400 mr-3" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-sm text-gray-500">
                        Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                      </p>
                      <div className="flex items-center mt-1">
                        {getStatusIcon(doc.status)}
                        <span className={`ml-1 text-sm ${
                          doc.status === 'completed' ? 'text-green-600' :
                          doc.status === 'error' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </div>
                      {doc.error_message && (
                        <p className="text-sm text-red-600 mt-1">{doc.error_message}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="ml-4 p-2 text-red-600 hover:text-red-900 rounded-full hover:bg-red-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
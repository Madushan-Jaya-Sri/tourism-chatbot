// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Admin/Dashboard';
import ChatWindow from './components/Chat/ChatWindow';
import Loading from './components/common/loading';

const App = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          setAuth(null);
          return;
        }

        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.user) {
          setAuth(response.data.user);
        } else {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setAuth(null);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setAuth(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    verifyAuth();
  }, []);

  // Set up axios interceptor for token handling
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setAuth(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loading size="large" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Custom auth guard component
  const ProtectedRoute = ({ children, adminRequired = false }) => {
    if (!auth) {
      return <Navigate to="/login" />;
    }

    if (adminRequired && !auth.is_admin) {
      return <Navigate to="/chat" />;
    }

    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route 
            path="/login" 
            element={auth ? <Navigate to="/chat" /> : <Login setAuth={setAuth} />}
          />
          <Route 
            path="/register" 
            element={auth ? <Navigate to="/chat" /> : <Register setAuth={setAuth} />}
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminRequired={true}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatWindow user={auth} setAuth={setAuth} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <ChatWindow user={auth} setAuth={setAuth} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<Navigate to="/chat" />}
          />
        </Routes>

        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
};

export default App;
// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

// Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Admin/Dashboard';
import ChatWindow from './components/Chat/ChatWindow';
import Navbar from './components/common/Navbar';
import Loading from './components/common/loading';

// Protected Route Component
const ProtectedRoute = ({ children, adminRequired = false }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token');

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        setAuthenticated(true);
        setIsAdmin(response.data.user.is_admin);
      } catch (error) {
        localStorage.removeItem('token');
        setAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loading size="large" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" />;
  }

  if (adminRequired && !isAdmin) {
    return <Navigate to="/chat" />;
  }

  return children;
};

const App = () => {
  const [auth, setAuth] = useState(null);

  // Set up axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setAuth(null);
        }
        return Promise.reject(error);
      }
    );

    // Verify auth on mount
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/api/auth/me`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          setAuth(response.data.user);
        }
      } catch (error) {
        localStorage.removeItem('token');
        setAuth(null);
      }
    };

    verifyAuth();

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {auth && <Navbar user={auth} setAuth={setAuth} />}
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              auth ? (
                <Navigate to="/chat" />
              ) : (
                <Login setAuth={setAuth} />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              auth ? (
                <Navigate to="/chat" />
              ) : (
                <Register setAuth={setAuth} />
              )
            } 
          />

          {/* Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminRequired>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatWindow />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              <ProtectedRoute>
                <ChatWindow />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route
            path="/"
            element={<Navigate to="/chat" />}
          />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={5000}
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
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
import Loading from './components/common/Loading';

// Remove Navbar import

const App = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/auth/me`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          setAuth(response.data.user);
        }
      } catch (error) {
        localStorage.removeItem('token');
        setAuth(null);
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

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Remove Navbar component from here */}
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
              !auth ? (
                <Navigate to="/login" />
              ) : !auth.is_admin ? (
                <Navigate to="/chat" />
              ) : (
                <Dashboard />
              )
            }
          />
          <Route
            path="/chat"
            element={
              !auth ? (
                <Navigate to="/login" />
              ) : (
                <ChatWindow user={auth} setAuth={setAuth} />
              )
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              !auth ? (
                <Navigate to="/login" />
              ) : (
                <ChatWindow user={auth} setAuth={setAuth} />
              )
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
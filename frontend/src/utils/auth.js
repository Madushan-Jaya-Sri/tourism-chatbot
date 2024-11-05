// src/utils/auth.js
import axios from 'axios';

export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const removeToken = () => {
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const setupAxiosInterceptors = (logout) => {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        removeToken();
        logout();
      }
      return Promise.reject(error);
    }
  );
};

export const verifyAuth = async () => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/auth/me`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    return response.data.user;
  } catch (error) {
    removeToken();
    return null;
  }
};
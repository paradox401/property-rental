import React, { createContext, useState } from 'react';
import { API_BASE_URL } from '../config/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser || storedUser === 'undefined' || storedUser === 'null') {
        return null;
      }
      return JSON.parse(storedUser);
    } catch (err) {
      console.warn('Invalid user in localStorage. Clearing stored session.', err);
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const updateUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  const login = async (email, password, role) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) return { error: data.error || 'Login failed' };

      const userData = {
        _id: data.user._id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
        ownerVerificationStatus: data.user.ownerVerificationStatus,
      };

      updateUser(userData);
      setToken(data.token);

      localStorage.setItem('token', data.token);

      return data;
    } catch (error) {
      return { error: 'Server error. Please try again later.' };
    }
  };

  const logout = () => {
    updateUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

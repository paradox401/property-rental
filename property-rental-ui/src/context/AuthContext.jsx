import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = async ( email, password, role) => {
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({email, password, role }),
      });
  
      const data = await res.json();
  
      if (!res.ok) return { error: data.error || 'Login failed' };
  
      const userData = {
        _id: data.user._id,
        email: data.user.email,
        role: data.user.role,

      };
  
      setUser(userData);
      setToken(data.token);
  
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userData));
  
      return data;
    } catch (error) {
      return { error: 'Server error. Please try again later.' };
    }
  };
  

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {jwtDecode} from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUser({
          id: decoded.sub,
          username: decoded.username,
          role: decoded.role,
        });
        setOnboarded(decoded.onboarded || false);
        console.log('Token decoded, user set:', {
          id: decoded.sub,
          username: decoded.username,
          role: decoded.role,
          onboarded: decoded.onboarded || false
        });
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
    setAuthChecked(true);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    try {
      const decoded = jwtDecode(token);
      const userData = {
        id: decoded.sub,
        username: decoded.username,
        role: decoded.role,
      };
      setCurrentUser(userData);
      setOnboarded(decoded.onboarded || false);
      console.log('After login, currentUser:', userData);
      console.log('After login, onboarded:', decoded.onboarded || false);
    } catch (err) {
      console.error('Invalid login token:', err);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setOnboarded(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        onboarded,
        login,
        logout,
        loading,
        authChecked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
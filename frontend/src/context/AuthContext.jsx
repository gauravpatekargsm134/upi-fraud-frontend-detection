import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { collectDeviceMetadata } from '../services/metadataCollector';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('aegis_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default demo user for instant testability
    return {
      id: 1,
      full_name: 'Aman Sharma',
      email: 'demo@aegispay.com',
      upi_id: 'amansharma@aegis',
      account_balance: 85420.50,
      primary_city: 'Bengaluru, Karnataka'
    };
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('aegis_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('aegis_user');
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      let meta = {};
      try {
        meta = await collectDeviceMetadata();
      } catch (e) {}
      const res = await authAPI.login({
        email,
        password,
        device_fingerprint: meta.device_fingerprint,
        gps_lat: meta.gps_lat,
        gps_lon: meta.gps_lon,
        city: meta.city
      });
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Login failed. Please check credentials.'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      let meta = {};
      try {
        meta = await collectDeviceMetadata();
      } catch (e) {}
      const res = await authAPI.register({
        ...userData,
        device_fingerprint: meta.device_fingerprint,
        gps_lat: meta.gps_lat,
        gps_lon: meta.gps_lon,
        city: meta.city
      });
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Registration failed.'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aegis_user');
  };

  const updateBalance = (newBalance) => {
    setUser((prev) => (prev ? { ...prev, account_balance: newBalance } : null));
  };

  const resetBalance = async (amount = 100000.0) => {
    try {
      const res = await authAPI.resetBalance({ amount, email: user?.email, upi_id: user?.upi_id });
      const newBal = res.data?.account_balance !== undefined ? res.data.account_balance : amount;
      updateBalance(newBal);
      return { success: true, balance: newBal };
    } catch (err) {
      updateBalance(amount);
      return { success: true, balance: amount };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateBalance, resetBalance, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

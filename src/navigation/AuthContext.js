import React, { createContext, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logoutUser } from '../store/slices/authSlice';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const reduxAuth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [featureFlags, setFeatureFlags] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reduxAuth.user) {
      setUser(reduxAuth.user);
      setPermissions(reduxAuth.user.permissions || []);
      setFeatureFlags(reduxAuth.user.feature_flags || {});
    } else {
      setUser(null);
      setPermissions([]);
      setFeatureFlags({});
    }
  }, [reduxAuth.user]);

  const login = async (apiResponseData) => {
    setUser(apiResponseData);
    setPermissions(apiResponseData.permissions || []);
    setFeatureFlags(apiResponseData.feature_flags || {});
    await AsyncStorage.setItem('user_session', JSON.stringify(apiResponseData));
  };

  const logout = async () => {
    setUser(null);
    setPermissions([]);
    setFeatureFlags({});
    await AsyncStorage.removeItem('user_session');
    dispatch(logoutUser());
  };

  return (
    <AuthContext.Provider value={{ user, permissions, featureFlags, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

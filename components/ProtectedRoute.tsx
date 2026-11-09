import React from 'react';
import { Navigate } from 'react-router-dom';
import * as Storage from '../services/storageService';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!Storage.isUnlocked()) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;

import { useContext } from 'react';
import { AuthContext } from '../Auth/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен быть внутри AuthProvider');
  }
  return context;
};

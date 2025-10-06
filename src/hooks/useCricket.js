import { useContext } from 'react';
import { CricketContext } from '../CricketContext';

export const useCricket = () => {
  const context = useContext(CricketContext);
  if (!context) {
    throw new Error('useCricket must be used within a CricketProvider');
  }
  return context;
};
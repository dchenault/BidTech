'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface StaffSessionContextType {
  isStaffSession: boolean;
  staffName: string | null;
  logoutStaff: () => void;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [isStaffSession, setIsStaffSession] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);

  useEffect(() => {
    // This code runs only on the client, after hydration.
    const name = localStorage.getItem('staffName');
    if (name) {
      setStaffName(name);
      setIsStaffSession(true);
    }
  }, []);

  const logoutStaff = () => {
    localStorage.removeItem('staffName');
    localStorage.removeItem('activeAuctionId');
    localStorage.removeItem('isStaffSession');
    localStorage.removeItem('staffAccountId');
    setStaffName(null);
    setIsStaffSession(false);
    // Reload to clear all state and revert to admin view
    window.location.reload(); 
  };


  const value = { isStaffSession, staffName, logoutStaff };

  return (
    <StaffSessionContext.Provider value={value}>
      {children}
    </StaffSessionContext.Provider>
  );
}

export const useStaffSession = (): StaffSessionContextType => {
  const context = useContext(StaffSessionContext);
  if (context === undefined) {
    throw new Error('useStaffSession must be used within a StaffSessionProvider');
  }
  return context;
};

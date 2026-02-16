'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface StaffSessionContextType {
  isStaffSession: boolean;
  staffName: string | null;
  logoutStaff: () => void;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [isStaffSession, setIsStaffSession] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    // This code runs only on the client, after hydration.
    const name = localStorage.getItem('staffName');
    const isSession = localStorage.getItem('isStaffSession') === 'true';
    if (name && isSession) {
      setStaffName(name);
      setIsStaffSession(true);
    }
  }, []);

  const logoutStaff = async () => {
    const accountId = localStorage.getItem('staffAccountId');
    const auctionId = localStorage.getItem('activeAuctionId');
    
    // Clear local state immediately for snappy UI response
    localStorage.removeItem('staffName');
    localStorage.removeItem('activeAuctionId');
    localStorage.removeItem('isStaffSession');
    localStorage.removeItem('staffAccountId');
    setStaffName(null);
    setIsStaffSession(false);
    
    // If this was a shadow login, delete the manager's session marker document.
    // If it was a public PIN login, the user will be null, and we do nothing here
    // (the anonymous user's session doc should be deleted by a function on the PIN page if needed).
    if (firestore && accountId && auctionId && user) {
        const staffSessionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', user.uid);
        await deleteDoc(staffSessionRef).catch(err => {
            console.error("Could not clean up staff session marker:", err);
        });
    }
    
    // Reload to clear all state and revert to the main login/dashboard view.
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

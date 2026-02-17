
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface StaffSessionContextType {
  isStaffSession: boolean;
  staffName: string | null;
  logoutStaff: () => void;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);

// Helper function to get initial state, runs only on client
const getInitialSessionState = () => {
  if (typeof window === 'undefined') {
    return { isStaffSession: false, staffName: null };
  }
  const name = localStorage.getItem('staffName');
  const isSession = localStorage.getItem('isStaffSession') === 'true';
  if (name && isSession) {
    return { isStaffSession: true, staffName: name };
  }
  return { isStaffSession: false, staffName: null };
};


export function StaffSessionProvider({ children }: { children: ReactNode }) {
  // Initialize state synchronously from localStorage on the client
  const [session, setSession] = useState(getInitialSessionState);
  
  const firestore = useFirestore();
  const { user } = useUser();

  const logoutStaff = async () => {
    const accountId = localStorage.getItem('staffAccountId');
    const auctionId = localStorage.getItem('activeAuctionId');
    
    // Clear local state immediately for snappy UI response
    localStorage.removeItem('staffName');
    localStorage.removeItem('activeAuctionId');
    localStorage.removeItem('isStaffSession');
    localStorage.removeItem('staffAccountId');
    setSession({ isStaffSession: false, staffName: null });
    
    // If this was a shadow login, delete the manager's session marker document.
    if (firestore && accountId && auctionId && user) {
        const staffSessionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', user.uid);
        await deleteDoc(staffSessionRef).catch(err => {
            console.error("Could not clean up staff session marker:", err);
        });
    }
    
    window.location.reload(); 
  };

  const value = { ...session, logoutStaff };

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

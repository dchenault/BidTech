
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface StaffSessionContextType {
  isStaffSession: boolean;
  staffName: string | null;
  staffAccountId: string | null;
  logoutStaff: () => void;
  isSessionLoading: boolean;
}

const StaffSessionContext = createContext<StaffSessionContextType | undefined>(undefined);


export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ isStaffSession: boolean; staffName: string | null, staffAccountId: string | null }>({ isStaffSession: false, staffName: null, staffAccountId: null });
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const firestore = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    // This effect runs only on the client, after hydration.
    const name = localStorage.getItem('staffName');
    const accountId = localStorage.getItem('staffAccountId');
    const isSession = localStorage.getItem('isStaffSession') === 'true';
    
    if (name && isSession && accountId) {
      setSession({ isStaffSession: true, staffName: name, staffAccountId: accountId });
    }
    setIsSessionLoading(false);
  }, []);

  const logoutStaff = async () => {
    if (!auth) return;

    const accountId = localStorage.getItem('staffAccountId');
    const auctionId = localStorage.getItem('activeAuctionId');
    const currentUid = auth.currentUser?.uid;
    
    // Clear local storage immediately
    localStorage.removeItem('staffName');
    localStorage.removeItem('activeAuctionId');
    localStorage.removeItem('isStaffSession');
    localStorage.removeItem('staffAccountId');
    
    setSession({ isStaffSession: false, staffName: null, staffAccountId: null });
    
    // Clean up the firestore session document
    if (firestore && accountId && auctionId && currentUid) {
        const staffSessionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', currentUid);
        await deleteDoc(staffSessionRef).catch(err => {
            console.error("Could not clean up staff session marker:", err);
        });
    }

    // Sign out the anonymous user and then reload the page to clear all state.
    await signOut(auth);
    window.location.href = '/'; 
  };

  const value = { ...session, logoutStaff, isSessionLoading };

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

'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Import the actual page component
import AuctionDetailsPage from '@/app/dashboard/auctions/[id]/page';

// We need to re-create the context providers that AuctionDetailsPage depends on.
import { SearchProvider } from '@/hooks/use-search';
import { Gavel, Loader2, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Create a slimmed-down AccountProvider just for this page context.
// This is safe because we are defining a new, scoped `useAccount` hook below.
const StaffAccountContext = createContext<{ accountId: string | null; isLoading: boolean; }>({ accountId: null, isLoading: true });

function StaffAccountProvider({ children, accountId }: { children: ReactNode; accountId: string | null }) {
    // This provider simply passes down the accountId from the URL.
    return (
        <StaffAccountContext.Provider value={{ accountId, isLoading: !accountId }}>
            {children}
        </StaffAccountContext.Provider>
    );
}

// This allows useAccount() to work inside the nested AuctionDetailsPage component for this specific page.
// It overrides the global hook within this component's scope.
export const useAccount = (): { accountId: string | null; isLoading: boolean; } => {
    const context = useContext(StaffAccountContext);
    if (context === undefined) throw new Error('useAccount must be used within this page\'s StaffAccountProvider');
    return context;
};

export default function PublicStaffAuctionPage() {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const params = useParams();
    
    const accountId = typeof params.accountId === 'string' ? params.accountId : '';
    const auctionId = typeof params.auctionId === 'string' ? params.auctionId : '';

    useEffect(() => {
        // This effect runs only on the client.
        const staffName = localStorage.getItem('staffName');
        const staffAccountId = localStorage.getItem('staffAccountId');
        const staffAuctionId = localStorage.getItem('activeAuctionId');
        
        // Check if the localStorage session matches the URL params
        if (staffName && staffAccountId === accountId && staffAuctionId === auctionId) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
        }
    }, [accountId, auctionId]);


    if (isAuthorized === null) {
        // Waiting for client-side localStorage check
        return (
            <div className="flex h-full flex-1 flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying session...</p>
            </div>
        );
    }
    
    if (!isAuthorized) {
        return (
             <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 text-center">
                <Frown className="h-16 w-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have an active staff session for this auction.</p>
                <Button asChild>
                    <Link href={`/staff-login/${accountId}/${auctionId}`}>
                        Go to Staff Login
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <StaffAccountProvider accountId={accountId}>
            <SearchProvider>
                <AuctionDetailsPage />
            </SearchProvider>
        </StaffAccountProvider>
    );
}

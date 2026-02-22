'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { ClientLayout } from '@/components/client-layout';
import { Loader2, Gavel } from 'lucide-react';
import { useStaffSession } from '@/hooks/use-staff-session';
import { useAccount } from '@/hooks/use-account';
import { useUserSetup } from '@/hooks/use-user-setup';
import { WaitingForAccountPage } from '@/components/waiting-for-account';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { isStaffSession, isSessionLoading: isStaffSessionLoading } = useStaffSession();
  
  // These two hooks work together. useUserSetup ensures the user's profile
  // is created if they just signed up. useAccount reads that profile.
  const { isSetupLoading } = useUserSetup();
  const { accountId, isLoading: isAccountLoading } = useAccount();

  const isLoading = isStaffSessionLoading || isUserLoading || isSetupLoading || isAccountLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
              <Gavel className="h-10 w-10 text-primary-foreground" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading session...</p>
      </div>
    );
  }
  
  // Auth Guard 1: Not logged in at all.
  if (!user && !isStaffSession) {
    router.push('/login');
    return null;
  }
  
  // Auth Guard 2: Logged in, but has no associated account.
  if (user && !accountId && !isStaffSession) {
    return <WaitingForAccountPage />;
  }
  
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}

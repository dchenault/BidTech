'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { ClientLayout } from '@/components/client-layout';
import { Loader2, Gavel } from 'lucide-react';
import { useStaffSession } from '@/hooks/use-staff-session';
import { useAccount } from '@/hooks/use-account';
import { useRoleSync } from '@/hooks/use-role-sync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { isStaffSession, isSessionLoading } = useStaffSession();
  const { accountId, isLoading: isAccountLoading } = useAccount();

  // New hook to sync roles on load
  useRoleSync(accountId);

  const isLoading = isSessionLoading || (isUserLoading && !isStaffSession) || isAccountLoading;

  // This is the unified loading state. We wait until we know for sure if it's
  // a staff session or until the regular user's auth state has been resolved.
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
  
  // This is the unified Auth Guard.
  // If all loading is complete and we have neither a regular user nor a staff session, redirect to login.
  if (!user && !isStaffSession) {
    router.push('/login');
    return null; // Render nothing while redirecting.
  }

  // If we pass the guard, render the standard layout. The ClientLayout component
  // itself will correctly handle hiding the sidebar for staff sessions.
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { ClientLayout } from '@/components/client-layout';
import { Loader2, Gavel, LogOut, RefreshCcw } from 'lucide-react';
import { useStaffSession } from '@/hooks/use-staff-session';
import { useAccount } from '@/hooks/use-account';
import { useRoleSync } from '@/hooks/use-role-sync';
import { useUserSetup } from '@/hooks/use-user-setup';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { isStaffSession, isSessionLoading } = useStaffSession();
  const { accountId, isLoading: isAccountLoading } = useAccount();

  // Handle one-time user setup and invitation claiming logic.
  const { isSetupLoading } = useUserSetup();

  // Sync roles if the user is listed in the account's admin list.
  useRoleSync(accountId);

  const isLoading = isSessionLoading || (isUserLoading && !isStaffSession) || isAccountLoading || isSetupLoading;

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  // This is the unified loading state. We wait until auth, session, and setup are resolved.
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
              <Gavel className="h-10 w-10 text-primary-foreground" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Checking your organization access...</p>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
          
          <p className="mt-12 max-w-xs text-xs text-muted-foreground">
            If you're having trouble loading, try clearing your browser cache or signing out and back in.
          </p>
      </div>
    );
  }
  
  // This is the unified Auth Guard.
  if (!user && !isStaffSession) {
    router.push('/login');
    return null;
  }

  // If we pass the guard, render the standard layout.
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}

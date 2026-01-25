
'use client';

import { ClientLayout } from '@/components/client-layout';
import { useUserSetup } from '@/hooks/use-user-setup';
import { useAccount } from '@/hooks/use-account';
import { Loader2, Gavel } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // useUserSetup handles the one-time creation of a user's account and profile docs.
  const { isSetupLoading } = useUserSetup();
  
  // The main loading condition for the dashboard is now just the setup hook.
  // The account is available as soon as the user is authenticated.
  if (isSetupLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
              <Gavel className="h-10 w-10 text-primary-foreground" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Finalizing account setup...</p>
      </div>
    );
  }

  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}

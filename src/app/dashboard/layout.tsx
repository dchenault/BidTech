
'use client';

import { ClientLayout } from '@/components/client-layout';
import { useUserSetup } from '@/hooks/use-user-setup';
import { useAccount } from '@/hooks/use-account';
import { Loader2, Gavel } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // useUserSetup must be called to trigger the setup logic for new users.
  const { isSetupLoading } = useUserSetup();
  
  // useAccount determines which account's data to show.
  const { isLoading: isAccountLoading } = useAccount();

  // The main loading condition depends on both setup and account resolution.
  if (isSetupLoading || isAccountLoading) {
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

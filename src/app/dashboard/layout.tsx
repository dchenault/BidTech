
'use client';

import { ClientLayout } from '@/components/client-layout';
import { useUserSetup } from '@/hooks/use-user-setup';
import { Loader2, Gavel } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSetupLoading } = useUserSetup();

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

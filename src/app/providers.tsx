'use client';

import { Suspense } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { SearchProvider } from '@/hooks/use-search';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AccountProvider } from '@/hooks/use-account';
import { StaffSessionProvider } from '@/hooks/use-staff-session';
import { Loader2 } from 'lucide-react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <FirebaseClientProvider>
        <StaffSessionProvider>
          <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          }>
            <AccountProvider>
              <SearchProvider>
                {children}
                <Toaster />
              </SearchProvider>
            </AccountProvider>
          </Suspense>
        </StaffSessionProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}

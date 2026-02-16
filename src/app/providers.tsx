
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { SearchProvider } from '@/hooks/use-search';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AccountProvider } from '@/hooks/use-account';
import { StaffSessionProvider } from '@/hooks/use-staff-session';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <FirebaseClientProvider>
        <StaffSessionProvider>
          <AccountProvider>
            <SearchProvider>
              {children}
              <Toaster />
            </SearchProvider>
          </AccountProvider>
        </StaffSessionProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}

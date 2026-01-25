
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { SearchProvider } from '@/hooks/use-search';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AccountProvider } from '@/hooks/use-account';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <FirebaseClientProvider>
        <AccountProvider>
          <SearchProvider>
            {children}
            <Toaster />
          </SearchProvider>
        </AccountProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}


'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { SearchProvider } from '@/hooks/use-search';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <FirebaseClientProvider>
        <SearchProvider>
          {children}
          <Toaster />
        </SearchProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}

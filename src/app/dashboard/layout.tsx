'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { ClientLayout } from '@/components/client-layout';
import { Loader2, Gavel } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  // State to safely check for staff session on the client, preventing hydration errors
  const [isStaffSessionActive, setIsStaffSessionActive] = useState<boolean | null>(null);

  useEffect(() => {
    // This effect runs only on the client side.
    setIsStaffSessionActive(!!localStorage.getItem('staffName'));
  }, []);

  const isStaffPath = pathname.includes('/staff');

  // While we determine if it's a staff session on the client, show a loader.
  // Also wait for Firebase Auth to initialize if it's not a staff session.
  if (isStaffSessionActive === null || (isUserLoading && !isStaffSessionActive)) {
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
  
  // The Auth Guard: If not a regular user AND not a staff member, redirect.
  if (!user && !isStaffPath && !isStaffSessionActive) {
    router.push('/login');
    return null; // Render nothing while redirecting
  }

  // Render the standard layout for both regular users and staff.
  // The ClientLayout component itself will correctly hide the sidebar for staff sessions.
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}

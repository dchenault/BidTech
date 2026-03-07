'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Legacy invitation route. Redirects to the dashboard.
 * New invitations use the /[accountId]/[token] structure.
 */
export default function LegacyInvitePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect all traffic from legacy [inviteId] routes to the dashboard
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

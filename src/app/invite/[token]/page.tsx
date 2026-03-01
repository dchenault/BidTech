'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * This route is legacy. Organization invites now use the nested [accountId]/[token] structure.
 * We maintain this file as a simple redirect to avoid broken links if any were previously shared,
 * though older links won't have the accountId. New invitations use the direct path strategy.
 */
export default function LegacyInvitePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home or a generic help page since we lack the accountId context
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm font-medium italic">Redirecting to home...</p>
    </div>
  );
}

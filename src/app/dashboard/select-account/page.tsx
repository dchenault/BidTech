
'use client';

import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';
import type { Membership } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2, Gavel, ArrowRight, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function SelectAccountPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const membershipsQuery = useMemoFirebase(
    () => (firestore && user ? query(collectionGroup(firestore, 'memberships'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  
  const { data: memberships, isLoading: isMembershipsLoading } = useCollection<Membership>(membershipsQuery);

  if (isUserLoading || isMembershipsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!memberships || memberships.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Gavel className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Accounts Found</CardTitle>
            <CardDescription>
              You don't seem to be a member of any organization. 
              Contact your administrator or create your own account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/dashboard">Check Again</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/settings/team">
                <PlusCircle className="mr-2 h-4 w-4" />
                Invite Team Members
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Select Organization</h1>
        <p className="text-muted-foreground text-lg">Choose an account to continue to your dashboard.</p>
      </div>

      <div className="grid gap-4">
        {memberships.map((membership) => (
          <Card 
            key={membership.id} 
            className="hover:border-primary hover:shadow-md transition-all cursor-pointer group" 
            onClick={() => router.push(`/dashboard?account=${membership.accountId}`)}
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-xl group-hover:text-primary transition-colors">
                  {membership.accountId === user?.uid ? 'Personal Account' : `Organization: ${membership.accountId}`}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">
                        {membership.role}
                    </span>
                    <span className="text-xs text-muted-foreground italic">
                        {membership.email}
                    </span>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

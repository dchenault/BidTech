'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Membership, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2, Gavel, ArrowRight, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function SelectAccountPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: profile, isLoading: isProfileLoading } = useDoc<User>(userRef);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(true);

  useEffect(() => {
    const fetchMemberships = async () => {
      if (!profile?.accounts || !firestore || !user) {
        setIsLoadingMemberships(false);
        return;
      }

      setIsLoadingMemberships(true);
      try {
        const accountIds = Object.keys(profile.accounts);
        const fetchPromises = accountIds.map(async (accId) => {
          const mRef = doc(firestore, 'accounts', accId, 'memberships', user.uid);
          const mSnap = await getDoc(mRef);
          return mSnap.exists() ? { id: mSnap.id, ...mSnap.data() } as Membership : null;
        });
        
        const results = await Promise.all(fetchPromises);
        setMemberships(results.filter((m): m is Membership => m !== null));
      } catch (err) {
        console.error("Error fetching memberships for selector:", err);
      } finally {
        setIsLoadingMemberships(false);
      }
    };

    fetchMemberships();
  }, [profile, firestore, user]);

  if (isUserLoading || isProfileLoading || isLoadingMemberships) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Gavel className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Accounts Found</CardTitle>
            <CardDescription>
              You don't seem to be an active member of any organization. 
              Check your invitation email or create your own account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/dashboard">Refresh Dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/settings">
                <PlusCircle className="mr-2 h-4 w-4" />
                Go to Settings
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
            key={membership.accountId} 
            className="hover:border-primary hover:shadow-md transition-all cursor-pointer group" 
            onClick={() => router.push(`/dashboard?account=${membership.accountId}`)}
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-xl group-hover:text-primary transition-colors">
                  {membership.accountId === user?.uid ? 'Personal Account' : `Organization ID: ${membership.accountId.slice(0, 8)}...`}
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

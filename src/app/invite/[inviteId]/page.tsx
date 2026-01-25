'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel, Loader2, AlertTriangle } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { Invitation } from '@/lib/types';
import Link from 'next/link';
import { setupNewUser } from '@/firebase/user-setup';

type Status = 'loading' | 'requires_login' | 'error' | 'success' | 'processing';

export default function InvitePage() {
  const { user, firestore, auth, isUserLoading } = useFirebase();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const inviteId = Array.isArray(params.inviteId) ? params.inviteId[0] : params.inviteId;

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isAuthCallLoading, setIsAuthCallLoading] = useState(false);
  const [inviteData, setInviteData] = useState<Invitation | null>(null);

  const processInvitation = useCallback(async () => {
    if (!firestore || !inviteId || !auth) {
      setError('An unexpected error occurred. The invitation is invalid.');
      setStatus('error');
      return;
    }

    const inviteRef = doc(firestore, 'invitations', inviteId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      setError('This invitation is invalid or has been revoked.');
      setStatus('error');
      return;
    }
    
    const fetchedInviteData = inviteSnap.data() as Invitation;
    setInviteData(fetchedInviteData);

    if (!user) {
      setStatus('requires_login');
      return;
    }
    
    setStatus('processing');

    try {
      if (fetchedInviteData.status === 'accepted' && fetchedInviteData.acceptedBy === user.uid) {
        toast({ title: "Invitation already accepted", description: "Redirecting to your dashboard." });
        router.push(`/dashboard`);
        return;
      }

      if (fetchedInviteData.email.toLowerCase() !== user.email?.toLowerCase()) {
        setError(`This invitation is for ${fetchedInviteData.email}. You are logged in as ${user.email}. Please log in with the correct account.`);
        setStatus('error');
        return;
      }
      
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setupNewUser(firestore, user);
      }
      
      const batch = writeBatch(firestore);
      
      batch.update(userRef, { [`accounts.${fetchedInviteData.accountId}`]: 'manager' });
      
      const auctionRef = doc(firestore, 'accounts', fetchedInviteData.accountId, 'auctions', fetchedInviteData.auctionId);
      batch.update(auctionRef, { [`managers.${user.uid}`]: true });

      const updatedInviteRef = doc(firestore, 'invitations', inviteId);
      batch.update(updatedInviteRef, { status: 'accepted', acceptedBy: user.uid });

      await batch.commit();

      setStatus('success');
      toast({
        title: 'Invitation Accepted!',
        description: "You've been granted access to the auction.",
      });
      router.push(`/dashboard`);

    } catch (e: any) {
      console.error("Error processing invitation:", e);
      setError(e.message || 'An error occurred while trying to accept the invitation.');
      setStatus('error');
    }
  }, [user, firestore, inviteId, router, toast, auth]);

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }
    processInvitation();
  }, [isUserLoading, processInvitation, user]);

  const handleGoogleLogin = () => {
    if (!auth) return;
    setIsAuthCallLoading(true);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message || 'Could not sign in with Google.',
      });
    }).finally(() => {
        setIsAuthCallLoading(false);
    });
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
      case 'processing':
        return (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{status === 'loading' ? 'Verifying invitation...' : 'Finalizing permissions...'}</p>
          </div>
        );
      case 'requires_login':
        return (
            <>
            <CardHeader>
                <CardTitle className="text-2xl">You're Invited!</CardTitle>
                <CardDescription>To accept your invitation for the auction, please sign in or create an account with <span className="font-bold">{inviteData?.email}</span>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleGoogleLogin} className="w-full" size="lg" disabled={isAuthCallLoading}>
                    {isAuthCallLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In with Google
                </Button>
                <Link href="/login" passHref>
                    <Button variant="outline" className="w-full" size="lg" disabled={isAuthCallLoading}>
                        Sign In with Email
                    </Button>
                </Link>
                 <Link href="/signup" passHref>
                    <Button variant="link" className="w-full">
                        Don't have an account? Sign up
                    </Button>
                </Link>
            </CardContent>
            </>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Invitation Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </div>
        );
      case 'success':
         return (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Success! Redirecting you now...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <div className="mx-auto my-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Gavel className="h-8 w-8 text-primary-foreground" />
        </div>
        {renderContent()}
      </Card>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel, Loader2, AlertTriangle } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until Firebase has determined the auth state
    }

    const processInvitation = async () => {
      if (!user) {
        setStatus('requires_login');
        return;
      }

      if (!firestore || !inviteId) {
        setError('An unexpected error occurred. The invitation is invalid.');
        setStatus('error');
        return;
      }

      setStatus('processing');

      try {
        const accountId = 'account-1'; // Hardcoded for this app

        // Step 1: Ensure the user's own document exists before proceeding.
        const userRef = doc(firestore, 'accounts', accountId, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // User document doesn't exist, create it.
          const newUserDoc = {
            id: user.uid,
            accountId: accountId,
            email: user.email,
            role: 'manager', // Invited users are managers
            avatarUrl: user.photoURL,
            name: user.displayName,
          };
          await setDoc(userRef, newUserDoc);
        }
        
        // Step 2: Now that the user is guaranteed to be an account member, process the invite.
        const inviteRef = doc(firestore, 'accounts', accountId, 'invitations', inviteId);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          setError('This invitation is invalid or has been revoked.');
          setStatus('error');
          return;
        }

        const inviteData = inviteSnap.data();

        if (inviteData.status === 'accepted') {
          toast({ title: "Invitation already accepted.", description: "You already have access to this auction." });
          router.push(`/dashboard/auctions/${inviteData.auctionId}`);
          return;
        }

        if (inviteData.email.toLowerCase() !== user.email?.toLowerCase()) {
          setError(`This invitation is for ${inviteData.email}. You are logged in as ${user.email}. Please log in with the correct account.`);
          setStatus('error');
          return;
        }

        // All checks passed, accept the invitation
        const batch = writeBatch(firestore);
        const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', inviteData.auctionId);
        
        // Use dot notation to update a specific field in the managers map
        batch.update(auctionRef, { [`managers.${user.uid}`]: inviteData.role || 'manager' });
        batch.update(inviteRef, { status: 'accepted', acceptedBy: user.uid });

        await batch.commit();

        setStatus('success');
        toast({
          title: 'Invitation Accepted!',
          description: "You've been granted access to the auction.",
        });
        router.push(`/dashboard/auctions/${inviteData.auctionId}`);

      } catch (e: any) {
        console.error("Error processing invitation:", e);
        setError(e.message || 'An error occurred while trying to accept the invitation. The security rules may have blocked the action.');
        setStatus('error');
      }
    };

    processInvitation();

  }, [user, isUserLoading, firestore, inviteId, router, toast, auth]);

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
                <CardDescription>To accept your invitation to manage an auction, please sign in.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleGoogleLogin} className="w-full" size="lg" disabled={isAuthCallLoading}>
                    {isAuthCallLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.8S111.8 17.6 244 17.6c70.1 0 129.2 28.2 174.4 73.4l-66.2 64.3c-24-22.9-56.2-39-94.2-39-70.1 0-127.1 57.1-127.1 127.1s57.1 127.1 127.1 127.1c78.8 0 112.3-59.3 115.8-87.1H244V253.3h239.3c5.4 28.7 8.7 59.8 8.7 94.5z"></path>
                    </svg>
                    )}
                    Sign In with Google
                </Button>
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

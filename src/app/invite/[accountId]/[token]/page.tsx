'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { Membership } from '@/lib/types';
import Link from 'next/link';
import { setupNewUser } from '@/firebase/user-setup';

type Status = 'verifying' | 'ready' | 'processing' | 'success' | 'error' | 'unauthorized';

export default function InvitePage({ params }: { params: { accountId: string; token: string } }) {
  const { accountId, token } = params;
  const { firestore, auth } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [accountName, setAccountName] = useState<string>('Organization');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    const fetchInviteDirectly = async () => {
      if (!firestore || !accountId || !token) return;

      try {
        // Direct Path Lookup: Token is used as the Document ID for pending memberships
        const inviteRef = doc(firestore, 'accounts', accountId, 'memberships', token);
        
        console.log("EXECUTION: Firing getDoc now for path:", inviteRef.path);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          console.warn(`Invite Lookup Failed: No document found at ${inviteRef.path}`);
          throw new Error('This invitation link is invalid or has expired.');
        }

        const mData = { id: inviteSnap.id, ...inviteSnap.data() } as Membership;
        setMembership(mData);

        // Fetch organization name for UI context
        const accountRef = doc(firestore, 'accounts', accountId);
        const accountSnap = await getDoc(accountRef);
        if (accountSnap.exists()) {
          setAccountName(accountSnap.data().name);
        }
        
        setStatus('ready');
      } catch (err: any) {
        console.error("FULL ERROR OBJECT:", err);
        
        if (err.code === 'permission-denied') {
            setError('Access Denied: Missing permissions to verify this link. Please check your organization settings.');
        } else {
            setError(err.message || 'Could not verify invitation.');
        }
        setStatus('error');
      }
    };

    fetchInviteDirectly();
  }, [firestore, accountId, token]);

  useEffect(() => {
    if (status === 'ready' && user && membership) {
      // Security: Ensure the signed-in user's email matches the invitation
      if (user.email?.toLowerCase() !== membership.email.toLowerCase()) {
        setStatus('unauthorized');
      }
    }
  }, [user, membership, status]);

  const handleAcceptInvite = async () => {
    if (!auth || !firestore || !membership) return;

    // Trigger auth if not logged in
    if (!user) {
      setIsAuthLoading(true);
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Login Failed', description: err.message });
      } finally {
        setIsAuthLoading(false);
      }
      return; 
    }

    setStatus('processing');

    try {
      // Re-verify the invitation record exists before starting batch
      const inviteRef = doc(firestore, 'accounts', accountId, 'memberships', token);
      const inviteSnap = await getDoc(inviteRef);
      
      if (!inviteSnap.exists()) throw new Error("Invitation no longer exists.");

      const batch = writeBatch(firestore);
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      // If user profile doesn't exist (new user), initialize the root record
      if (!userSnap.exists()) {
        await setupNewUser(firestore, user);
      }

      // Conversion Strategy: Move from token-based ID to permanent UID-based ID
      const newMRef = doc(firestore, 'accounts', accountId, 'memberships', user.uid);
      
      const newMData: Membership = {
        ...membership,
        id: user.uid,
        userId: user.uid,
        status: 'active',
        inviteToken: "" // Clear token to prevent reuse
      };
      
      batch.set(newMRef, newMData);

      // Delete the temporary token-keyed invitation document
      if (token !== user.uid) {
        batch.delete(inviteRef);
      }

      // Update user's organizational context
      batch.update(userRef, {
        [`accounts.${accountId}`]: membership.role,
        activeAccountId: accountId
      });

      await batch.commit();
      
      setStatus('success');
      toast({ title: 'Welcome aboard!', description: `You have joined ${accountName}.` });
      
      // Pass accountId to dashboard to ensure correct context
      setTimeout(() => {
        router.push(`/dashboard?account=${accountId}`);
      }, 1500);

    } catch (err: any) {
      console.error('Acceptance error:', err);
      setError('Failed to finalize your membership. Please try again.');
      setStatus('error');
    }
  };

  const renderContent = () => {
    if (status === 'verifying') {
      return (
        <div className="flex flex-col items-center py-10 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying your invitation...</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center py-10 gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Invitation Error</h2>
          <p className="text-muted-foreground px-6">{error}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      );
    }

    if (status === 'unauthorized') {
      return (
        <div className="flex flex-col items-center py-10 gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-bold">Wrong Account</h2>
          <p className="text-muted-foreground px-6">
            This invitation was sent to <strong>{membership?.email}</strong>, but you are signed in as <strong>{user?.email}</strong>.
          </p>
          <Button onClick={() => {
            auth?.signOut();
            setStatus('verifying');
          }} variant="outline">Sign Out and Try Again</Button>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="flex flex-col items-center py-10 gap-4 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold">Success!</h2>
          <p className="text-muted-foreground">Joining {accountName}...</p>
          <Loader2 className="h-6 w-6 animate-spin text-primary mt-2" />
        </div>
      );
    }

    return (
      <>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            You have been invited to join <strong>{accountName}</strong> as <strong>{membership?.role === 'admin' ? 'an Administrator' : 'Staff'}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-6">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            By accepting, you will gain access to manage auctions and data for this organization.
          </div>
          <Button 
            className="w-full h-12 text-lg font-semibold" 
            onClick={handleAcceptInvite}
            disabled={status === 'processing' || isAuthLoading}
          >
            {(status === 'processing' || isAuthLoading) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {user ? 'Accept Invite' : 'Sign In to Accept Invite'}
          </Button>
          {user && (
            <p className="text-center text-xs text-muted-foreground">
              Signed in as {user.email}
            </p>
          )}
        </CardContent>
      </>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md shadow-xl overflow-hidden border-t-4 border-t-primary">
        <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Gavel className="h-8 w-8 text-primary" />
        </div>
        {renderContent()}
      </Card>
    </div>
  );
}

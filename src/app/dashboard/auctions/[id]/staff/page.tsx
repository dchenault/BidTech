'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { onAuthStateChanged, type Auth, type User } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Gavel, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StaffLoginPage() {
  const params = useParams();
  const { toast } = useToast();

  // State to hold Firebase services and IDs
  const [firestore, setFirestore] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const auctionId = typeof params.id === 'string' ? params.id : '';

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Initialize Firebase services on component mount
    const { firestore: fs, auth: au } = initializeFirebase();
    setFirestore(fs);
    setAuth(au);

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(au, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && fs) {
        // If user is logged in, fetch their account ID
        try {
          const userProfileRef = doc(fs, 'users', currentUser.uid);
          const userProfileSnap = await getDoc(userProfileRef);
          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data();
            setAccountId(profileData.activeAccountId);
          } else {
            setError('Could not find user profile.');
          }
        } catch (e) {
          setError('Failed to fetch user data.');
        }
      }
      setIsLoadingServices(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStaffLogin = async () => {
    setError(null);
    const enteredUsername = username.trim();

    if (!enteredUsername) {
      setError('Please enter a username');
      return;
    }

    if (!firestore || !accountId || !auctionId) {
      setError('Application context is not ready. Please try again.');
      return;
    }

    setIsLoggingIn(true);

    try {
      const staffDocRef = doc(
        firestore,
        'accounts',
        accountId,
        'auctions',
        auctionId,
        'staff',
        enteredUsername
      );
      const staffDoc = await getDoc(staffDocRef);

      if (staffDoc.exists()) {
        localStorage.setItem('staffName', enteredUsername);
        localStorage.setItem('activeAuctionId', auctionId);
        localStorage.setItem('staffAccountId', accountId);
        localStorage.setItem('isStaffSession', 'true');

        // Create the session marker document for the currently logged-in manager
        if (user) {
          const staffSessionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', user.uid);
          await setDoc(staffSessionRef, { isManagerSession: true, managerUid: user.uid, createdAt: new Date() });
        }

        toast({
          title: 'Staff Session Started',
          description: `You are now acting as ${enteredUsername}.`,
        });
        window.location.href = `/dashboard/auctions/${auctionId}`;
      } else {
        setError('This username is not authorized for this auction.');
      }
    } catch (err: any) {
      console.error('Staff login error:', err);
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const renderContent = () => {
      if (isLoadingServices) {
          return (
              <CardContent className="flex flex-col items-center gap-4 p-10">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading context...</p>
              </CardContent>
          );
      }

      if (!user || !accountId) {
            return (
              <CardContent className="flex flex-col items-center gap-4 text-center p-10">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                  <h2 className="text-xl font-semibold">Authentication Error</h2>
                  <p className="text-muted-foreground">{error || "You must be logged in as a manager to start a staff session."}</p>
              </CardContent>
          );
      }

      return (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                    <Gavel className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle>Start Staff Session</CardTitle>
                <CardDescription>Enter a staff username to enter staff mode for this auction.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      {error && (
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Login Failed</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                      )}
                      <div className="space-y-2">
                      <Label htmlFor="username">Staff Username</Label>
                      <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter Username"
                          disabled={isLoggingIn}
                          onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              handleStaffLogin();
                          }
                          }}
                      />
                      </div>
                  </div>
              </CardContent>

              <CardFooter>
                  <Button onClick={handleStaffLogin} className="w-full" disabled={isLoggingIn}>
                      {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login as Staff
                  </Button>
              </CardFooter>
            </>
      )
  }

  return (
    <div className="flex w-full items-center justify-center py-12">
        <Card className="w-full max-w-md">
            {renderContent()}
        </Card>
    </div>
  );
}

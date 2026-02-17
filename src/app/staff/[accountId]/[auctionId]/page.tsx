
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Gavel, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PublicStaffUsernameLoginPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore, auth } = useFirebase();

  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const auctionId = typeof params.auctionId === 'string' ? params.auctionId : '';

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const enteredUsername = username.trim();

    if (!enteredUsername) {
      setError('Please enter a username.');
      return;
    }
    
    if (!firestore || !auth || !accountId || !auctionId) {
      setError('Page is not ready. Please refresh and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Check if the username is valid for this auction (the "handshake").
      // This is allowed by the security rule: `allow get: if true;`
      const staffUsernameRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', enteredUsername);
      const staffUsernameDoc = await getDoc(staffUsernameRef);

      if (staffUsernameDoc.exists()) {
        // Step 2: Username is valid. Sign in anonymously to get a secure, temporary user session.
        const userCredential = await signInAnonymously(auth);
        const anonymousUid = userCredential.user.uid;
        
        // Step 3: Create a session document in Firestore that links the anonymous UID to this auction.
        // This is the document our security rules will check for data access.
        const staffSessionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', anonymousUid);
        await setDoc(staffSessionRef, { username: enteredUsername, createdAt: new Date() });

        // Step 4: Store session info in localStorage for the client-side UI.
        localStorage.setItem('staffName', enteredUsername);
        localStorage.setItem('activeAuctionId', auctionId);
        localStorage.setItem('isStaffSession', 'true');
        localStorage.setItem('staffAccountId', accountId);

        toast({
          title: "Login Successful",
          description: "You have been logged in as a staff member."
        });

        // Step 5: Hard redirect to the main dashboard. It will now recognize the staff session.
        window.location.href = `/dashboard/auctions/${auctionId}`;

      } else {
        setError('This username is not authorized for this auction.');
        setIsLoading(false);
      }

    } catch (err: any) {
      console.error("Staff login error:", err);
      setError('An error occurred during login. Please ensure you are online and try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <Gavel className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle>Staff Portal Login</CardTitle>
        <CardDescription>Enter your assigned username to access the auction tools.</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
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
              placeholder="Enter username"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

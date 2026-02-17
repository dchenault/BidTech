
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, type Firestore } from 'firebase/firestore';

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
import { AlertCircle, Gavel, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PublicStaffUsernameLoginPage() {
  const params = useParams();
  const { toast } = useToast();

  const [firestore, setFirestore] = useState<Firestore | null>(null);

  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const auctionId = typeof params.auctionId === 'string' ? params.auctionId : '';

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    // This page initializes its own Firebase instance to be self-sufficient.
    const { firestore: fs } = initializeFirebase();
    setFirestore(fs);
    setIsPageLoading(false);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const enteredUsername = username.trim();

    if (!enteredUsername) {
      setError('Please enter a username.');
      return;
    }
    
    if (!firestore || !accountId || !auctionId) {
      setError('Page is not ready. Please refresh and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const staffDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', enteredUsername);
      const staffDoc = await getDoc(staffDocRef);

      if (staffDoc.exists()) {
        localStorage.setItem('staffName', enteredUsername);
        localStorage.setItem('activeAuctionId', auctionId);
        localStorage.setItem('isStaffSession', 'true');
        localStorage.setItem('staffAccountId', accountId);

        toast({
          title: "Login Successful",
          description: "You have been logged in as a staff member."
        });

        // Hard redirect to force dashboard to re-evaluate context
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

  if (isPageLoading) {
    return (
      <div className="flex w-full items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

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

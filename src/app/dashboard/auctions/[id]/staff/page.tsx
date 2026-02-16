'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAccount } from '@/hooks/use-account';

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

export default function StaffLoginPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const auctionId = typeof params.id === 'string' ? params.id : '';

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !firestore || !accountId || !auctionId || !user) {
      setError('Required information is missing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Verify the username is valid for this auction.
      const staffUsernameRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', username.trim());
      const staffUsernameSnap = await getDoc(staffUsernameRef);

      if (!staffUsernameSnap.exists()) {
        throw new Error('Invalid username for this auction.');
      }
      
      // Step 2: Create a session marker document using the currently logged-in manager's UID.
      // The security rules will check for this document's existence to grant staff permissions.
      const staffSessionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', user.uid);
      await setDoc(staffSessionRef, { 
          actingAs: username.trim(),
          managerUid: user.uid,
          createdAt: new Date(),
      });

      // Step 3: Save session info to localStorage and perform a hard redirect.
      localStorage.setItem('staffName', username.trim());
      localStorage.setItem('activeAuctionId', auctionId);
      localStorage.setItem('isStaffSession', 'true');
      localStorage.setItem('staffAccountId', accountId);

      toast({ title: "Staff Session Started", description: `You are now acting as ${username.trim()}.`})

      window.location.href = `/dashboard/auctions/${auctionId}`;

    } catch (err: any) {
      console.error("Staff login error:", err);
      setError(err.message || 'An error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Gavel className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle>Staff Login</CardTitle>
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., JohnS"
                required
                disabled={isLoading}
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
    </div>
  );
}

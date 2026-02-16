'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
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

export default function StaffLoginPage() {
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();
  const { accountId } = useAccount();

  const auctionId = typeof params.id === 'string' ? params.id : '';

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !firestore || !accountId || !auctionId) {
      setError('Username cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const staffDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', username.trim());
      const staffDocSnap = await getDoc(staffDocRef);

      if (staffDocSnap.exists()) {
        // Save session info and redirect
        sessionStorage.setItem('staffName', username.trim());
        sessionStorage.setItem('activeAuctionId', auctionId);
        sessionStorage.setItem('isStaffSession', 'true');
        sessionStorage.setItem('staffAccountId', accountId); // Persist the account ID
        router.push(`/dashboard/auctions/${auctionId}`);
      } else {
        setError('Invalid username for this auction.');
      }
    } catch (err) {
      console.error("Staff login error:", err);
      setError('An error occurred during login. Please try again.');
    } finally {
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

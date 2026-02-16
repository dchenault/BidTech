
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';

export default function StaffLoginPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const auctionId = typeof params.id === 'string' ? params.id : '';

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStaffLogin = async () => {
    setError(null);
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    if (!firestore || !accountId || !auctionId) {
      setError('Required application context is missing. Cannot proceed.');
      return;
    }

    setIsLoading(true);
    const enteredUsername = username.trim();

    try {
      const staffDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', enteredUsername);
      const staffDoc = await getDoc(staffDocRef);

      if (staffDoc.exists()) {
        localStorage.setItem('staffName', enteredUsername);
        localStorage.setItem('activeAuctionId', auctionId);
        localStorage.setItem('staffAccountId', accountId);

        toast({ title: "Staff Session Started", description: `You are now acting as ${enteredUsername}.`});
        window.location.href = `/dashboard/auctions/${auctionId}`;
      } else {
        setError('Username not found for this auction');
      }
    } catch (err: any) {
      console.error("Staff login error:", err);
      setError(err.message || 'An error occurred during login. Please try again.');
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
                disabled={isLoading}
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
          <Button onClick={handleStaffLogin} className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login as Staff
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

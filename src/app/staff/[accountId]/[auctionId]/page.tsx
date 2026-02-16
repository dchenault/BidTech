
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import type { Auction } from '@/lib/types';
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

export default function PublicStaffLoginPage() {
  const router = useRouter();
  const params = useParams();
  const { firestore, auth } = useFirebase();
  const { toast } = useToast();

  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const auctionId = typeof params.auctionId === 'string' ? params.auctionId : '';

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [auction, setAuction] = useState<Auction | null>(null);

  useEffect(() => {
    if (!firestore || !accountId || !auctionId) return;

    const fetchAuction = async () => {
      try {
        const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
        const auctionSnap = await getDoc(auctionRef);
        if (auctionSnap.exists()) {
          setAuction(auctionSnap.data() as Auction);
        } else {
          setError('Auction not found or you do not have permission to view it.');
        }
      } catch (err) {
        console.error("Error fetching auction:", err);
        setError('An error occurred while fetching auction details.');
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchAuction();
  }, [firestore, accountId, auctionId]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pin.trim() || !firestore || !auth || !auction) {
      setError('PIN cannot be empty.');
      return;
    }
    
    if (pin !== auction.staffPin) {
      setError('Invalid PIN for this auction.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Sign in anonymously
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      // 2. Create the staff session document in Firestore
      const staffDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', user.uid);
      
      // The security rules require us to pass the PIN when creating the session doc
      await setDoc(staffDocRef, { 
          staffPin: pin,
          createdAt: new Date(),
      });

      // 3. Save session info and redirect
      sessionStorage.setItem('staffName', 'Staff'); // Using a generic name
      sessionStorage.setItem('activeAuctionId', auctionId);
      sessionStorage.setItem('isStaffSession', 'true');
      sessionStorage.setItem('staffAccountId', accountId);

      toast({
        title: "Login Successful",
        description: "You have been logged in as a staff member."
      });

      router.push(`/dashboard/auctions/${auctionId}`);

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

  if (!auction) {
      return (
           <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Login Failed</AlertTitle>
                        <AlertDescription>{error || "This auction could not be loaded."}</AlertDescription>
                    </Alert>
                </CardContent>
           </Card>
      );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <Gavel className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle>Staff Portal Login</CardTitle>
        <CardDescription>Enter the PIN for "{auction.name}" to access the auction tools.</CardDescription>
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
            <Label htmlFor="pin">Staff PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 4-8 digit PIN"
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
  );
}

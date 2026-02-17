
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Gavel, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StaffLoginPage() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const params = useParams();
    const router = useRouter();
    const { firestore, auth } = useFirebase();
    const { toast } = useToast();

    const accountId = typeof params.accountId === 'string' ? params.accountId : '';
    const auctionId = typeof params.auctionId === 'string' ? params.auctionId : '';

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        const enteredUsername = username.trim().toLowerCase();

        if (!enteredUsername) {
            setError('Please enter a username.');
            return;
        }
        if (!auth || !firestore || !accountId || !auctionId) {
            setError('Invalid URL or missing database connection.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const staffUsernameRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', enteredUsername);
            const staffUsernameDoc = await getDoc(staffUsernameRef);

            if (staffUsernameDoc.exists()) {
                 // If there's an existing user, sign them out first to ensure a clean slate
                if (auth.currentUser) {
                    await signOut(auth);
                }
                
                const userCredential = await signInAnonymously(auth);
                const uid = userCredential.user.uid;

                // Create the session marker document that the security rules will check
                const staffSessionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId, 'staff', uid);
                await setDoc(staffSessionRef, {
                    username: enteredUsername,
                    createdAt: serverTimestamp(),
                });
                
                // Set localStorage items for the public page to use for non-sensitive UI state
                localStorage.setItem('staffName', enteredUsername);
                localStorage.setItem('staffAccountId', accountId);
                localStorage.setItem('activeAuctionId', auctionId);
                localStorage.setItem('isStaffSession', 'true');

                toast({ title: "Login Successful", description: "Redirecting to auction dashboard..." });
                router.push(`/public-staff/${accountId}/${auctionId}`);

            } else {
                setError('This username is not authorized for this auction.');
            }
        } catch (err: any) {
            console.error("Staff login error:", err);
            setError('An error occurred during login. Could not create a secure session.');
        } finally {
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
                    <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required disabled={isLoading} autoFocus />
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

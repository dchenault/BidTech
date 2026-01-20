
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Gavel, Loader2 } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';


export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isAuthCallLoading, setIsAuthCallLoading] = useState(false);

  const handleAuthError = (error: any, method: string) => {
    console.error(`${method} sign-in error`, error);
    toast({
      variant: 'destructive',
      title: 'Authentication Error',
      description: error.message || `Could not sign in with ${method}.`,
    });
    setIsAuthCallLoading(false);
  };

  const handleGoogleLogin = () => {
    if (!auth) {
      handleAuthError({ message: 'Firebase Auth is not available.' }, 'Google');
      return;
    }
    setIsAuthCallLoading(true);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .catch((error) => handleAuthError(error, 'Google'));
  };

  useEffect(() => {
    // Once the user state is determined and it's not loading, we can redirect.
    if (!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);


  // Show a loading spinner while Firebase is determining the auth state
  // or if the user is logged in but we are waiting for the redirect.
  if (isUserLoading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  // If not loading and no user, show the login page.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Gavel className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold">Bidtech</CardTitle>
          <CardDescription>Modern Auction Management</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleLogin} variant="outline" className="w-full" size="lg" disabled={isAuthCallLoading}>
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
        <CardFooter className="flex-col gap-4 pt-6">
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our Terms of Service and Privacy Policy. The first user to sign up will be the account administrator.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

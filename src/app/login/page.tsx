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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Gavel, Loader2 } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useEffect, useState, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginValues } from '@/lib/types';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleAuthError = (error: any, method: string) => {
    console.error(`${method} sign-in error`, error);
    toast({
      variant: 'destructive',
      title: 'Authentication Error',
      description: error.message || `Could not sign in with ${method}.`,
    });
    setIsGoogleLoading(false);
    setIsEmailLoading(false);
  };

  const handleGoogleLogin = () => {
    if (!auth) {
      handleAuthError({ message: 'Firebase Auth is not available.' }, 'Google');
      return;
    }
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) =>
      handleAuthError(error, 'Google')
    );
  };

  const handleEmailLogin = (values: LoginValues) => {
    if (!auth) {
      handleAuthError({ message: 'Firebase Auth is not available.' }, 'Email');
      return;
    }
    setIsEmailLoading(true);
    signInWithEmailAndPassword(auth, values.email, values.password).catch(
      (error) => handleAuthError(error, 'Email')
    );
  };

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = isGoogleLoading || isEmailLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Gavel className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold">
            Sign In to Bidtech
          </CardTitle>
          <CardDescription>Modern Auction Management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEmailLogin)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isEmailLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign In with Email
              </Button>
            </form>
          </Form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.8S111.8 17.6 244 17.6c70.1 0 129.2 28.2 174.4 73.4l-66.2 64.3c-24-22.9-56.2-39-94.2-39-70.1 0-127.1 57.1-127.1 127.1s57.1 127.1 127.1 127.1c78.8 0 112.3-59.3 115.8-87.1H244V253.3h239.3c5.4 28.7 8.7 59.8 8.7 94.5z"
                ></path>
              </svg>
            )}
            Sign In with Google
          </Button>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-6">
          <div className="text-sm">
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Don't have an account? Sign up.
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

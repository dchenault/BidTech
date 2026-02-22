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
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupValues } from '@/lib/types';
import Link from 'next/link';
import { setupNewUser } from '@/firebase/user-setup';

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const handleEmailSignup = async (values: SignupValues) => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Firebase services are not available.',
      });
      return;
    }
    setIsLoading(true);
    try {
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      
      const authUser = userCredential.user;

      // Step 2: Update their Auth profile with the name
      await updateProfile(authUser, {
        displayName: values.name,
      });
      
      // Step 3: Explicitly create their new account and user profile in Firestore
      await setupNewUser(firestore, authUser);

      // The onAuthStateChanged listener will handle the redirect to /dashboard
      // so we don't need to do it here.

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Error',
        description: error.message || 'Could not create your account.',
      });
      setIsLoading(false);
    }
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Gavel className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline font-bold">
            Create an Account
          </CardTitle>
          <CardDescription>
            Join Bidtech to start managing your auctions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEmailSignup)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Account
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-6">
          <div className="text-sm">
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Already have an account? Sign in.
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

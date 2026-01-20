
'use client';

import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-background border-b">
        <Link href="/" className="flex items-center justify-center">
          <Gavel className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold">AuctioneerPro</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/features"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Pricing
          </Link>
          <Link
            href="/support"
            className="text-sm font-medium hover:underline underline-offset-4"
          >
            Support
          </Link>
          {!isUserLoading && (
            user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
            )
          )}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AuctioneerPro Inc. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}

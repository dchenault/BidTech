
import Link from 'next/link';
import { Gavel } from 'lucide-react';

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-background border-b shrink-0">
        <Link href="/" className="flex items-center justify-center">
          <Gavel className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold">BidTech</span>
        </Link>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} BidTech Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

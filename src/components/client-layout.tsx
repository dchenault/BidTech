
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Home,
  PanelLeft,
  Search,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbSegments = segments.slice(1);

    return breadcrumbSegments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 2).join('/')}`;
      const isLast = index === breadcrumbSegments.length - 1;
      
      let breadcrumbText = decodeURIComponent(segment);
      // We are removing the logic that fetches auction/patron names here
      // as it was causing performance issues. The page components themselves
      // will handle displaying the correct names.
      if (segment.startsWith('auction-') || segment.startsWith('patron-')) {
          // A more sophisticated solution would fetch the specific name,
          // but for now, we can just show a generic placeholder or the ID.
      }


      return (
        <React.Fragment key={href}>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {isLast ? (
              <BreadcrumbPage className="capitalize">
                {breadcrumbText}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={href} className="capitalize">
                   {breadcrumbText}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        </React.Fragment>
      );
    });
  };
  
  return (
    <TooltipProvider>
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside
        className={`fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-14' : 'w-56'
        }`}
      >
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
           <Link
            href="/dashboard"
            className="group flex h-9 items-center gap-2 rounded-full px-3 text-lg font-semibold text-primary-foreground"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <Gavel className="h-5 w-5 text-primary-foreground transition-all group-hover:scale-110" />
            </div>
            {!isCollapsed && <span className="text-xl font-bold text-primary">BidTech</span>}
            <span className="sr-only">Bidtech</span>
          </Link>
          <MainNav isCollapsed={isCollapsed} />
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mt-auto h-9 w-9"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle sidebar</TooltipContent>
          </Tooltip>
        </nav>
      </aside>
      <div className={`flex flex-col sm:gap-4 sm:py-4 transition-all duration-300 ease-in-out ${isCollapsed ? 'sm:pl-14' : 'sm:pl-56'}`}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="#"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Gavel className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Bidtech</span>
                </Link>
                <MainNav isCollapsed={false} />
              </nav>
            </SheetContent>
          </Sheet>
          <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {getBreadcrumbs()}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="relative ml-auto flex-1 md:grow-0">
            {/* Search has been removed from here */}
          </div>
          <UserNav />
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}

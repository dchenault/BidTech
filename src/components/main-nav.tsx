
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gavel, LayoutDashboard, Settings, Users, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/auctions', label: 'Auctions', icon: Gavel },
  { href: '/dashboard/patrons', label: 'Patrons', icon: Users },
  { href: '/dashboard/donors', label: 'Donors', icon: Gift },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function MainNav({ className, isCollapsed }: { className?: string; isCollapsed: boolean }) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <nav className={cn('flex flex-col gap-2', className)}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true);
          return isCollapsed ? (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-4">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                isActive && 'bg-accent text-accent-foreground hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

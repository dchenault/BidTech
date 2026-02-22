
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
import { useAccount } from '@/hooks/use-account';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/dashboard/auctions', label: 'Auctions', icon: Gavel, adminOnly: false },
  { href: '/dashboard/patrons', label: 'Patrons', icon: Users, adminOnly: true },
  { href: '/dashboard/donors', label: 'Donors', icon: Gift, adminOnly: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export function MainNav({ className, isCollapsed }: { className?: string; isCollapsed: boolean }) {
  const pathname = usePathname();
  const { role } = useAccount();

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly) {
      return role === 'admin';
    }
    return true;
  });

  return (
    <TooltipProvider>
      <nav className={cn('flex flex-col gap-2', className)}>
        {navItems.map((item) => {
          let finalHref = item.href;
          if (item.href === '/dashboard/auctions' && role === 'staff') {
            finalHref = '/dashboard/my-auctions';
          }
          const isActive = pathname.startsWith(finalHref) && (finalHref === '/dashboard' ? pathname === finalHref : true);
          
          return isCollapsed ? (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={finalHref}
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
              href={finalHref}
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

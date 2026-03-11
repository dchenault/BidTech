'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gavel, LayoutDashboard, Settings, Users, Gift, Database, ChevronDown, FileOutput } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/auctions', label: 'Auctions', icon: Gavel },
  { href: '/dashboard/patrons', label: 'Patrons', icon: Users },
  { href: '/dashboard/donors', label: 'Donors', icon: Gift },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function MainNav({ className, isCollapsed }: { className?: string; isCollapsed: boolean }) {
  const pathname = usePathname();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <TooltipProvider>
      <nav className={cn('flex flex-col gap-2 w-full', className)}>
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

        <div className="pt-4 mt-4 border-t border-muted-foreground/10">
          <Collapsible
            open={isAdminOpen}
            onOpenChange={setIsAdminOpen}
            className="w-full"
          >
            {isCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground">
                      <Database className="h-5 w-5" />
                    </button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Admin Tools</TooltipContent>
              </Tooltip>
            ) : (
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-medium">Admin Tools</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isAdminOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent className="space-y-1 pt-1">
              <Link
                href="/dashboard/update-business"
                className={cn(
                  "flex items-center rounded-lg transition-all hover:text-primary",
                  isCollapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2 pl-10 text-xs",
                  pathname === "/dashboard/update-business" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {isCollapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Database className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent side="right">Update Business Names</TooltipContent>
                  </Tooltip>
                ) : (
                  "Update Business Names"
                )}
              </Link>
              
              <Link
                href="/dashboard/admin/export-tool"
                className={cn(
                  "flex items-center rounded-lg transition-all hover:text-primary",
                  isCollapsed ? "h-10 w-10 justify-center mx-auto" : "px-3 py-2 pl-10 text-xs",
                  pathname === "/dashboard/admin/export-tool" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {isCollapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <FileOutput className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent side="right">Universal Master Export</TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex items-center gap-3">
                    <FileOutput className="h-3 w-3" />
                    <span>Master Export Tool</span>
                  </div>
                )}
              </Link>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>
    </TooltipProvider>
  );
}

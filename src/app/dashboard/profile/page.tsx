
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { ThemeToggle } from '@/components/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading || !user) {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>View your personal information and preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div className="grid gap-2">
                             <Skeleton className="h-8 w-32" />
                             <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                     <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>View your personal information and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
                <h2 className="text-2xl font-semibold">{user.displayName}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user.displayName || ''} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user.email || ''} disabled />
            </div>
          </div>

           <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="text-lg font-medium">Theme</h3>
              <p className="text-sm text-muted-foreground">Select your preferred color scheme.</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

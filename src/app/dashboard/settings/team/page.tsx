'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/hooks/use-account';
import { useTeam } from '@/hooks/use-team';
import { useAuctions } from '@/hooks/use-auctions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, ShieldAlert, Loader2, Users } from 'lucide-react';
import { AddTeamMemberDialog } from '@/components/add-team-member-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUser } from '@/firebase';

export default function TeamManagementPage() {
  const router = useRouter();
  const { user } = useUser();
  const { role, isLoading: isAccountLoading } = useAccount();
  const { members, isLoading: isLoadingTeam, addMember, removeMember } = useTeam();
  const { auctions, isLoading: isLoadingAuctions } = useAuctions();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; email: string } | null>(null);

  // UI Guard: Redirect non-admins
  if (!isAccountLoading && role !== 'admin') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-3xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to manage team members.</p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  if (isAccountLoading || isLoadingTeam) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage roles and permissions for your organization.</p>
        </div>
        <Button onClick={() => setIsAddMemberOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Memberships
          </CardTitle>
          <CardDescription>
            A list of all users who have access to this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.email}</span>
                      {member.status === 'pending' && (
                        <span className="text-xs text-muted-foreground italic">Awaiting first login</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'outline' : 'secondary'} className="capitalize">
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.role === 'admin' ? (
                      <span className="text-sm font-medium text-primary">Global Access</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {member.assignedAuctions.length > 0 ? (
                          member.assignedAuctions.map(id => {
                            const auction = auctions.find(a => a.id === id);
                            return (
                              <Badge key={id} variant="outline" className="text-[10px]">
                                {auction?.name || 'Unknown Auction'}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground">No auctions assigned</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.email !== user?.email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemberToRemove({ id: member.id, email: member.email })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddTeamMemberDialog
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={addMember}
        auctions={auctions}
      />

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will instantly revoke access for <strong>{memberToRemove?.email}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => memberToRemove && removeMember(memberToRemove.id, memberToRemove.email)}
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

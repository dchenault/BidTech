
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useCallback } from 'react';
import { Membership, TeamMemberFormValues } from '@/lib/types';
import { useAccount } from './use-account';
import { useToast } from './use-toast';

export function useTeam() {
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { user } = useUser();
  const { toast } = useToast();

  const membershipsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'memberships') : null),
    [firestore, accountId]
  );

  const { data: members, isLoading } = useCollection<Membership>(membershipsRef);

  const addMember = useCallback(async (values: TeamMemberFormValues) => {
    if (!firestore || !accountId || !user) return;

    const email = values.email.toLowerCase().trim();
    // Sanitize email for a safe temporary document ID: test@gmail.com -> test-at-gmail-com
    const sanitizedEmailId = email.replace('@', '-at-').replace(/\./g, '-');
    
    // Generate a secure invite token
    const inviteToken = crypto.randomUUID();
    
    try {
      const membershipDocRef = doc(firestore, 'accounts', accountId, 'memberships', sanitizedEmailId);

      // 3. Prepare Membership Data
      const newMembership: Membership = {
        id: sanitizedEmailId,
        accountId,
        role: values.role,
        email,
        // Admins get global access (empty array represents all), Staff get specific assignments
        assignedAuctions: values.role === 'admin' ? [] : values.assignedAuctions,
        status: 'invited',
        invitedBy: user.uid,
        invitedAt: serverTimestamp(),
        inviteToken,
      };

      // 4. Save to Firestore
      await setDoc(membershipDocRef, newMembership);
      
      toast({
        title: "Staff Member Invited",
        description: `An invitation has been sent to ${email}.`,
      });
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast({
        variant: "destructive",
        title: "Invitation Failed",
        description: "You do not have permission to manage team members or the operation failed.",
      });
    }
  }, [firestore, accountId, user, toast]);

  const removeMember = useCallback(async (membershipId: string, email: string) => {
    if (!firestore || !accountId) return;

    try {
      const membershipDocRef = doc(firestore, 'accounts', accountId, 'memberships', membershipId);
      await deleteDoc(membershipDocRef);
      
      toast({
        title: "Member Removed",
        description: `${email} has been removed from the team.`,
      });
    } catch (error: any) {
      console.error("Error removing team member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove team member. Check your permissions.",
      });
    }
  }, [firestore, accountId, toast]);

  return {
    members: members || [],
    isLoading,
    addMember,
    removeMember,
  };
}

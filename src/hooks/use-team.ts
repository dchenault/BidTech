'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
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
    const inviteToken = crypto.randomUUID();
    
    try {
      // 1. Fetch organization name for the email template
      const accountRef = doc(firestore, 'accounts', accountId);
      const accountSnap = await getDoc(accountRef);
      const orgName = accountSnap.exists() ? accountSnap.data().name : 'Your Organization';

      // 2. Create membership document using the token as the ID for direct lookup initially,
      // but the landing page now also uses a query for robustness.
      const membershipDocRef = doc(firestore, 'accounts', accountId, 'memberships', inviteToken);

      const newMembership: Membership = {
        id: inviteToken,
        accountId,
        role: values.role,
        email,
        assignedAuctions: values.role === 'admin' ? [] : values.assignedAuctions,
        status: 'invited',
        invitedBy: user.uid,
        invitedAt: serverTimestamp(),
        inviteToken,
      };

      // 3. Save membership to Firestore
      await setDoc(membershipDocRef, newMembership);
      
      // 4. Trigger invitation email (Standardized Template Nesting)
      // Standard Link Format: /invite/[accountId]/[token]
      const inviteLink = `https://bidtech.net/invite/${accountId}/${inviteToken}`;
      
      await addDoc(collection(firestore, 'mail'), {
        to: email,
        accountId: accountId,
        template: {
          name: 'staff-invite',
          data: {
            inviteToken: inviteToken,
            inviteLink: inviteLink,
            orgName: orgName,
            role: values.role
          }
        }
      });

      toast({
        title: "Staff Member Invited",
        description: `An invitation has been sent to ${email}.`,
      });
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast({
        variant: "destructive",
        title: "Invitation Failed",
        description: error.message || "Failed to create invitation.",
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

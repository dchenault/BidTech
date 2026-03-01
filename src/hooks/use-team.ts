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
    const sanitizedEmailId = email.replace('@', '-at-').replace(/\./g, '-');
    const inviteToken = crypto.randomUUID();
    
    try {
      // 1. Fetch organization name for the email template
      const accountRef = doc(firestore, 'accounts', accountId);
      const accountSnap = await getDoc(accountRef);
      const orgName = accountSnap.exists() ? accountSnap.data().name : 'Your Organization';

      // 2. Create membership document
      const membershipDocRef = doc(firestore, 'accounts', accountId, 'memberships', sanitizedEmailId);

      const newMembership: Membership = {
        id: sanitizedEmailId,
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
      
      // 4. Trigger invitation email (Corrected Template Nesting)
      const mailRef = collection(firestore, 'mail');
      await addDoc(mailRef, {
        to: email,
        accountId: accountId, // Required root field for Security Rules
        template: {
          name: 'staff-invite', // Correct: Direct child of template
          data: {               // Correct: Variables nested in data
            orgName: orgName,
            role: values.role,
            inviteToken: inviteToken,
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

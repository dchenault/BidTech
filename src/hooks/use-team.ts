
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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
    // Use sanitized email as document ID to easily check for existing invites
    const membershipId = email.replace(/[^a-zA-Z0-9]/g, '_');
    const membershipDocRef = doc(firestore, 'accounts', accountId, 'memberships', membershipId);

    try {
      // Check if user already exists in root users collection to get their UID if possible
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const userSnap = await getDocs(q);
      
      const userId = !userSnap.empty ? userSnap.docs[0].id : undefined;

      const newMembership: Membership = {
        id: membershipId,
        userId,
        accountId,
        role: values.role,
        email,
        assignedAuctions: values.role === 'admin' ? [] : values.assignedAuctions,
        status: userId ? 'active' : 'pending',
        invitedBy: user.email || 'Admin',
        invitedAt: serverTimestamp(),
      };

      await setDoc(membershipDocRef, newMembership);
      
      toast({
        title: "Member Added",
        description: `${email} has been added to your team as ${values.role}.`,
      });
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add team member.",
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
        description: "Failed to remove team member.",
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

'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
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
    
    try {
      // 1. Search for existing user by email to get their UID
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email), limit(1));
      const userSnap = await getDocs(q);
      
      const foundUser = !userSnap.empty ? userSnap.docs[0] : null;
      const userId = foundUser ? foundUser.id : undefined;

      // 2. Determine Document ID (UID is preferred, sanitized email as fallback)
      const membershipId = userId || email.replace(/[^a-zA-Z0-9]/g, '_');
      const membershipDocRef = doc(firestore, 'accounts', accountId, 'memberships', membershipId);

      // 3. Prepare Membership Data
      const newMembership: Membership = {
        id: membershipId,
        userId,
        accountId,
        role: values.role,
        email,
        // Admins get global access (empty array represents all), Staff get specific assignments
        assignedAuctions: values.role === 'admin' ? [] : values.assignedAuctions,
        status: userId ? 'active' : 'pending',
        invitedBy: user.email || 'Admin',
        invitedAt: serverTimestamp(),
      };

      // 4. Save to Firestore
      await setDoc(membershipDocRef, newMembership);
      
      toast({
        title: foundUser ? "Member Added" : "Invitation Sent",
        description: foundUser 
          ? `${email} is now a member of your team.` 
          : `${email} has been invited. They will be added automatically when they join BidTech.`,
      });
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You do not have permission to manage team members or the user search failed.",
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

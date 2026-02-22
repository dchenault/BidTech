
'use client';
import {
  collection,
  doc,
  writeBatch,
  addDoc,
  query,
  where,
  arrayRemove,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import type { Invitation, InviteManagerFormValues } from '@/lib/types';
import { useToast } from './use-toast';
import { useAccount } from './use-account';


export function useInvitations() {
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { toast } = useToast();

  // Query for invitations belonging to the current account.
  const invitationsQueryRef = useMemoFirebase(
    () => (firestore && accountId 
      ? query(collection(firestore, 'invitations'), where('accountId', '==', accountId)) 
      : null),
    [firestore, accountId]
  );
  
  const { data: invitations, isLoading } = useCollection<Invitation>(invitationsQueryRef);


  const sendInvitation = async (values: InviteManagerFormValues): Promise<string | undefined> => {
    if (!firestore || !accountId) return undefined;

    const rootInvitationsRef = collection(firestore, 'invitations');

    try {
        const newInvitation = {
            ...values,
            email: values.email.toLowerCase(),
            role: 'staff',
            status: 'pending',
            accountId: accountId,
        };
      const docRef = await addDoc(rootInvitationsRef, newInvitation);
      
      const inviteLink = `${window.location.origin}/invite/${docRef.id}`;
      navigator.clipboard.writeText(inviteLink).then(() => {
        toast({
          title: 'Invitation Link Copied!',
          description: `The unique link for ${values.email} has been copied to your clipboard.`,
        });
      }).catch(() => {
        toast({
          title: 'Invitation Link Ready',
          description: `Please manually copy this link: ${inviteLink}`,
          duration: 10000,
        });
      });

      return docRef.id;

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invitation.',
      });
      return undefined;
    }
  };
  
  const revokeInvitation = async (invitationId: string, auctionId: string, acceptedByUid?: string) => {
    if (!firestore || !accountId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection not found.' });
      return;
    }
    
    try {
      const batch = writeBatch(firestore);
      
      const invitationRef = doc(firestore, 'invitations', invitationId);
      batch.delete(invitationRef);
      
      if (acceptedByUid) {
        const membershipRef = doc(firestore, 'accounts', accountId, 'memberships', acceptedByUid);
        batch.update(membershipRef, {
            assignedAuctions: arrayRemove(auctionId)
        });
      }
      
      await batch.commit();
      
      toast({
        title: 'Access Revoked',
        description: 'The user\'s access to that auction has been successfully removed.',
      });
      
    } catch(error) {
       console.error('Error revoking invitation:', error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not revoke manager access.',
      });
    }
  };

  return { 
    invitations: invitations || [],
    isLoading,
    sendInvitation,
    revokeInvitation,
  };
}

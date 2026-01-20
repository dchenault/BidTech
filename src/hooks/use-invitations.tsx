
'use client';
import {
  collection,
  doc,
  writeBatch,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import type { Invitation, InviteManagerFormValues } from '@/lib/types';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from './use-toast';


export function useInvitations() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const accountId = 'account-1'; // This should be dynamically determined
  const { toast } = useToast();

  const invitationsRef = useMemoFirebase(
    () => (firestore && !isUserLoading && user ? collection(firestore, 'accounts', accountId, 'invitations') : null),
    [firestore, accountId, user, isUserLoading]
  );
  
  const { data: invitations, isLoading } = useCollection<Invitation>(invitationsRef);

  const sendInvitation = async (values: InviteManagerFormValues) => {
    if (!invitationsRef) return;

    try {
        const newInvitation = {
            ...values,
            role: 'manager',
            status: 'pending',
            accountId: accountId,
        };
      await addDocumentNonBlocking(invitationsRef, newInvitation);
      
      toast({
        title: 'Invitation Sent!',
        description: `${values.email} has been invited to manage the selected auction. They will gain access upon their next login.`
      });

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invitation.',
      });
    }
  };
  
  const revokeInvitation = async (invitationId: string, auctionId: string, acceptedByUid?: string) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection not found.' });
      return;
    }
    
    try {
      const batch = writeBatch(firestore);
      
      // 1. Delete the invitation document
      const invitationRef = doc(firestore, 'accounts', accountId, 'invitations', invitationId);
      batch.delete(invitationRef);
      
      // 2. If the user had accepted, remove them from the auction's managers map
      if (acceptedByUid) {
        const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
        // To remove a key from a map, you must use dot notation with updateDoc
        // We use the batch's update method here
        batch.update(auctionRef, { [`managers.${acceptedByUid}`]: undefined });
      }
      
      await batch.commit();
      
      toast({
        title: 'Access Revoked',
        description: 'The manager\'s access has been successfully removed.',
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

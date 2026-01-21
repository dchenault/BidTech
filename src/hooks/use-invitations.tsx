'use client';
import {
  collection,
  doc,
  writeBatch,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import type { Invitation, InviteManagerFormValues } from '@/lib/types';
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

  const sendInvitation = async (values: InviteManagerFormValues): Promise<string | undefined> => {
    if (!invitationsRef) return undefined;

    try {
        const newInvitation = {
            ...values,
            role: 'manager',
            status: 'pending',
            accountId: accountId,
        };
      const docRef = await addDoc(invitationsRef, newInvitation);
      
      toast({
        title: 'Invitation Link Ready!',
        description: `A unique link has been generated for ${values.email}.`
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
        // To remove a key from a map, we can use dot notation with `delete` field value, 
        // but since we are in a transaction we can just set it to undefined which works for Firestore.
        // We will remove the field from the map.
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

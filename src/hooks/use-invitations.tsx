
'use client';
import {
  collection,
  doc,
  writeBatch,
  addDoc,
  query,
  where,
  deleteField,
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
  
  // useCollection now fetches only the relevant invitations.
  const { data: invitations, isLoading } = useCollection<Invitation>(invitationsQueryRef);


  const sendInvitation = async (values: InviteManagerFormValues): Promise<string | undefined> => {
    if (!firestore || !accountId) return undefined;

    const rootInvitationsRef = collection(firestore, 'invitations');

    try {
        const newInvitation = {
            ...values,
            email: values.email.toLowerCase(),
            role: 'manager',
            status: 'pending',
            accountId: accountId, // The inviting account
        };
      const docRef = await addDoc(rootInvitationsRef, newInvitation);
      
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
    if (!firestore || !accountId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection not found.' });
      return;
    }
    
    try {
      const batch = writeBatch(firestore);
      
      const invitationRef = doc(firestore, 'invitations', invitationId);
      batch.delete(invitationRef);
      
      // If the user had accepted, remove them from the auction's managers
      // and from their own user profile's account list.
      if (acceptedByUid) {
        const auctionRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
        batch.update(auctionRef, { [`managers.${acceptedByUid}`]: deleteField() });

        const userRef = doc(firestore, 'users', acceptedByUid);
        batch.update(userRef, { [`accounts.${accountId}`]: deleteField() });
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

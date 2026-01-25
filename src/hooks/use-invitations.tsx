
'use client';
import {
  collection,
  doc,
  writeBatch,
  addDoc,
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

  // Invitations are now a root collection. We query them based on the current accountId.
  const invitationsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'invitations') : null),
    [firestore]
  );
  
  const { data: allInvitations, isLoading } = useCollection<Invitation>(invitationsRef);

  const invitations = useMemoFirebase(() => {
      if (!allInvitations || !accountId) return [];
      return allInvitations.filter(inv => inv.accountId === accountId);
  }, [allInvitations, accountId]);


  const sendInvitation = async (values: InviteManagerFormValues): Promise<string | undefined> => {
    if (!invitationsRef || !accountId) return undefined;

    try {
        const newInvitation = {
            ...values,
            role: 'manager',
            status: 'pending',
            accountId: accountId, // The inviting account
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
        batch.update(auctionRef, { [`managers.${acceptedByUid}`]: undefined });

        const userRef = doc(firestore, 'users', acceptedByUid);
        batch.update(userRef, { [`accounts.${accountId}`]: undefined });
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

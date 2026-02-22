
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Gift, Users, Package, FilePieChart, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuctions, fetchAuctionItems, fetchRegisteredPatronsWithDetails } from '@/hooks/use-auctions';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { usePatrons } from '@/hooks/use-patrons';
import { useDonors } from '@/hooks/use-donors';
import {
  exportPatronsToCSV,
  exportDonorsToCSV,
  exportItemsToCSV,
  exportAllItemsToCSV,
  exportWinningBidsToCSV,
  exportAllWinningBidsToCSV,
  exportAuctionPatronsToCSV,
  exportDonationsToCSV,
  exportAllDonationsToCSV,
} from '@/lib/export';
import type { Item, Invitation, InviteManagerFormValues } from '@/lib/types';
import { useAccount } from '@/hooks/use-account';
import { ImportCsvDialog } from '@/components/import-csv-dialog';
import { ExportDialog, type ExportSelection } from '@/components/export-dialog';
import { Input } from '@/components/ui/input';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { z } from 'zod';
import { useInvitations } from '@/hooks/use-invitations';
import { InviteManagerForm } from '@/components/invite-manager-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


type ExportType = 'donors' | 'items' | 'reports' | 'patrons' | 'donations';

export default function SettingsPage() {
  const [isImportPatronsDialogOpen, setIsImportPatronsDialogOpen] = useState(false);
  const [isImportDonorsDialogOpen, setIsImportDonorsDialogOpen] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [exportDialog, setExportDialog] = useState<{ isOpen: boolean; type: ExportType; title: string; } | null>(null);
  
  const { auctions, isLoading: isLoadingAuctions, fetchAllItems } = useAuctions();
  const { patrons, isLoading: isLoadingPatrons, importPatronsFromCSV } = usePatrons();
  const { donors, isLoading: isLoadingDonors, importDonorsFromCSV } = useDonors();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { user } = useUser();
  const { accountId, role } = useAccount();
  const isAdmin = role === 'admin';

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);

  // --- Manager Invitation State & Logic ---
  const { invitations, isLoading: isLoadingInvitations, sendInvitation, revokeInvitation } = useInvitations();
  const [isInviteManagerOpen, setIsInviteManagerOpen] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<Invitation | null>(null);

  const auctionNameMap = useMemo(() => {
    return new Map(auctions.map(a => [a.id, a.name]));
  }, [auctions]);

  const handleSendInvitation = async (values: InviteManagerFormValues) => {
    const inviteId = await sendInvitation(values); // This hook now handles toasts
    if (inviteId) {
        setIsInviteManagerOpen(false); // Close dialog on success
    }
  };

  const handleRevokeInvitation = async () => {
    if (!invitationToRevoke) return;
    await revokeInvitation(invitationToRevoke.id, invitationToRevoke.auctionId, invitationToRevoke.acceptedBy);
    setInvitationToRevoke(null);
  };
  // --- End Manager Invitation Logic ---


  const adminsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'admins') : null),
    [firestore, accountId]
  );
  const { data: adminsData, isLoading: isLoadingAdmins } = useCollection(adminsRef);
  const admins = useMemo(() => adminsData?.map(adminDoc => adminDoc.id) || [], [adminsData]);

  const handleAddAdmin = async () => {
    const emailValidation = z.string().email().safeParse(newAdminEmail);
    if (!emailValidation.success) {
      toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address.' });
      return;
    }
    const validatedEmail = emailValidation.data.toLowerCase();

    if (!firestore || !accountId) return;
    if (admins.includes(validatedEmail)) {
        toast({ variant: 'destructive', title: 'Admin Exists', description: 'This user is already an admin.' });
        return;
    }

    setIsAddingAdmin(true);
    try {
      const adminDocRef = doc(firestore, 'accounts', accountId, 'admins', validatedEmail);
      await setDoc(adminDocRef, {
        email: validatedEmail,
        addedBy: user?.email,
        addedAt: new Date()
      });
      toast({ title: 'Admin Added', description: `${validatedEmail} has been added as an admin.` });
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add admin.' });
    } finally {
      setIsAddingAdmin(false);
    }
  };
  
  const handleRemoveAdmin = async () => {
    if (!firestore || !accountId || !adminToRemove) return;
    try {
        const adminDocRef = doc(firestore, 'accounts', accountId, 'admins', adminToRemove);
        await deleteDoc(adminDocRef);
        toast({ title: 'Admin Removed', description: `${adminToRemove} is no longer an admin.` });
        setAdminToRemove(null);
    } catch (error) {
        console.error('Error removing admin:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove admin.' });
    }
  };

  const handleOpenExportDialog = (type: any, title: string) => {
    setExportDialog({ isOpen: true, type, title });
  };
  
  const handleExport = async (selection: ExportSelection) => {
    if (!firestore || !accountId || !exportDialog) return;

    setIsProcessingExport(true);
    setExportDialog(null);

    try {
        const { type, auctionId } = selection;
        const getAuctionName = (id: string) => auctions.find(a => a.id === id)?.name || 'Unknown_Auction';
        const allItems = (type === 'full' && (exportDialog.type !== 'donors' && exportDialog.type !== 'patrons')) ? await fetchAllItems() : [];

        if (type === 'full' && allItems.length > 0) {
            const auctionMap = new Map(auctions.map(a => [a.id, a.name]));
            allItems.forEach(item => (item as Item & { auctionName: string }).auctionName = auctionMap.get(item.auctionId) || 'N/A');
        }

        switch (exportDialog.type) {
            case 'donors':
                if (type === 'full') exportDonorsToCSV(donors);
                else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    const donorIds = new Set(items.map(i => i.donorId).filter(Boolean));
                    const auctionDonors = donors.filter(d => donorIds.has(d.id!));
                    exportDonorsToCSV(auctionDonors, `donors_${getAuctionName(auctionId).replace(/\s+/g, '_').toLowerCase()}.csv`);
                } break;
            case 'items':
                if (type === 'full') exportAllItemsToCSV(allItems as (Item & { auctionName?: string })[]);
                else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    exportItemsToCSV(items, getAuctionName(auctionId));
                } break;
            case 'reports':
                if (type === 'full') exportAllWinningBidsToCSV(allItems as (Item & { auctionName?: string })[]);
                else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    exportWinningBidsToCSV(items, getAuctionName(auctionId));
                } break;
            case 'patrons':
                if (type === 'full') exportPatronsToCSV(patrons);
                else if (auctionId) {
                    const auctionPatrons = await fetchRegisteredPatronsWithDetails(firestore, accountId, auctionId);
                    exportAuctionPatronsToCSV(auctionPatrons, getAuctionName(auctionId));
                } break;
            case 'donations':
                 if (type === 'full') exportAllDonationsToCSV(allItems as (Item & { auctionName?: string })[]);
                 else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    exportDonationsToCSV(items, getAuctionName(auctionId));
                } break;
        }

    } catch (error) {
      console.error("Export failed:", error);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not fetch data for export.' });
    } finally {
      setIsProcessingExport(false);
    }
  };


  return (
    <>
    <div className="grid gap-6">
       <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>
            Bulk import patrons or donors from a CSV file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Button variant="outline" onClick={() => setIsImportPatronsDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Patrons
            </Button>
            <Button variant="outline" onClick={() => setIsImportDonorsDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Donors
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Download your auction data in CSV format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Button variant="outline" onClick={() => handleOpenExportDialog('donors', 'Donors')} disabled={isProcessingExport}>
                <Gift className="mr-2 h-4 w-4" />Donors
            </Button>
            <Button variant="outline" onClick={() => handleOpenExportDialog('items', 'Items')} disabled={isProcessingExport}>
                <Package className="mr-2 h-4 w-4" />Items
            </Button>
             <Button variant="outline" onClick={() => handleOpenExportDialog('reports', 'Auction Reports')} disabled={isProcessingExport}>
                <FilePieChart className="mr-2 h-4 w-4" />Auction Reports
            </Button>
             <Button variant="outline" onClick={() => handleOpenExportDialog('patrons', 'Patrons')} disabled={isProcessingExport}>
                <Users className="mr-2 h-4 w-4" />Patrons
            </Button>
             <Button variant="outline" onClick={() => handleOpenExportDialog('donations', 'Donations')} disabled={isProcessingExport}>
                <FileText className="mr-2 h-4 w-4" />Donations
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>
                Add or remove users who can manage account settings and billing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  type="email"
                  placeholder="new.admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  disabled={isAddingAdmin}
                />
                <Button onClick={handleAddAdmin} disabled={isAddingAdmin}>
                  {isAddingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Admin
                </Button>
              </div>
              <div className="rounded-md border">
                  {isLoadingAdmins ? (
                      <p className="p-4 text-sm text-muted-foreground">Loading admins...</p>
                  ) : admins.length > 0 ? (
                      <ul className="divide-y">
                          {admins.map(email => (
                              <li key={email} className="flex items-center justify-between p-3">
                                  <span className="text-sm font-medium">{email}</span>
                                  {email.toLowerCase() !== user?.email?.toLowerCase() && (
                                      <Button variant="ghost" size="icon" onClick={() => setAdminToRemove(email)}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                  )}
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <p className="p-4 text-center text-sm text-muted-foreground">No other admins have been added.</p>
                  )}
              </div>
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                      <CardTitle>Manager Access</CardTitle>
                      <CardDescription>Invite and manage users who can help run specific auctions.</CardDescription>
                  </div>
                  <Dialog open={isInviteManagerOpen} onOpenChange={setIsInviteManagerOpen}>
                      <DialogTrigger asChild>
                          <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Invite Manager</Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Invite a Manager</DialogTitle>
                              <DialogDescription>
                                  Enter an email and choose an auction to grant access to. A unique link will be generated and copied to your clipboard.
                              </DialogDescription>
                          </DialogHeader>
                          <InviteManagerForm auctions={auctions} onSubmit={handleSendInvitation} />
                      </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                  {isLoadingInvitations ? (
                      <div className="text-center text-muted-foreground p-4">Loading invitations...</div>
                  ) : (
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Auction</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {invitations.map(invite => (
                                  <TableRow key={invite.id}>
                                      <TableCell className="font-medium">{invite.email}</TableCell>
                                      <TableCell>{auctionNameMap.get(invite.auctionId) || 'Unknown Auction'}</TableCell>
                                      <TableCell>
                                          <Badge variant={invite.status === 'accepted' ? 'secondary' : 'default'} className="capitalize">
                                              {invite.status}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                          <Button variant="ghost" size="icon" onClick={() => setInvitationToRevoke(invite)}>
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  )}
              </CardContent>
          </Card>
        </>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Manage your subscription and payment details. (Placeholder)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Stripe integration for billing management is planned for a future update.</p>
        </CardContent>
      </Card>
    </div>

    {exportDialog && (
      <ExportDialog
        isOpen={exportDialog.isOpen}
        onClose={() => setExportDialog(null)}
        title={exportDialog.title}
        auctions={auctions}
        onExport={handleExport}
        isLoadingAuctions={isLoadingAuctions}
        isProcessingExport={isProcessingExport}
        reportOptions={exportDialog.type === 'reports' ? { full: 'All Winning Bids', specific: 'Winning Bids from a specific auction' } : undefined}
      />
    )}

    <ImportCsvDialog
        isOpen={isImportPatronsDialogOpen}
        onClose={() => setIsImportPatronsDialogOpen(false)}
        onImport={importPatronsFromCSV}
        expectedHeaders={['firstName', 'lastName', 'email']}
        title="Import Patrons from CSV"
        description="Upload a CSV file with patron data. The column headers must include: firstName, lastName, and email. Optional columns: phone, street, city, state, and zip."
    />
    
    <ImportCsvDialog
        isOpen={isImportDonorsDialogOpen}
        onClose={() => setIsImportDonorsDialogOpen(false)}
        onImport={importDonorsFromCSV}
        expectedHeaders={['name', 'type']}
        title="Import Donors from CSV"
        description="Upload a CSV file with donor data. The column headers must include: name, and type ('Individual' or 'Business'). Optional columns: email, phone, street, city, state, zip, and contactPerson."
    />
     <AlertDialog open={!!adminToRemove} onOpenChange={(isOpen) => !isOpen && setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove admin permissions for <strong>{adminToRemove}</strong>. They will no longer be able to manage account settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAdmin} className="bg-destructive hover:bg-destructive/90">
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!invitationToRevoke} onOpenChange={(isOpen) => !isOpen && setInvitationToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will revoke access for <strong>{invitationToRevoke?.email}</strong>. They will no longer be able to manage this auction. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeInvitation} className="bg-destructive hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Trash2, Upload, FileText, Gift, Users, Package, FilePieChart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { InviteManagerForm } from '@/components/invite-manager-form';
import { useAuctions, fetchAuctionItems, fetchRegisteredPatronsWithDetails } from '@/hooks/use-auctions';
import { useFirestore } from '@/firebase';
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
import { useInvitations } from '@/hooks/use-invitations';
import type { Invitation, Item } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useAccount } from '@/hooks/use-account';
import { ImportCsvDialog } from '@/components/import-csv-dialog';
import { ExportDialog, type ExportSelection } from '@/components/export-dialog';

type ExportType = 'donors' | 'items' | 'reports' | 'patrons' | 'donations';

export default function SettingsPage() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isImportPatronsDialogOpen, setIsImportPatronsDialogOpen] = useState(false);
  const [isImportDonorsDialogOpen, setIsImportDonorsDialogOpen] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<Invitation | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [exportDialog, setExportDialog] = useState<{ isOpen: boolean; type: ExportType; title: string; } | null>(null);
  
  const { auctions, isLoading: isLoadingAuctions, fetchAllItems } = useAuctions();
  const { patrons, isLoading: isLoadingPatrons, importPatronsFromCSV } = usePatrons();
  const { donors, isLoading: isLoadingDonors, importDonorsFromCSV } = useDonors();
  const { invitations, isLoading: isLoadingInvitations, sendInvitation, revokeInvitation } = useInvitations();
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const handleInviteSubmit = async (values: { email: string, auctionId: string }) => {
    const newInviteId = await sendInvitation(values);
    setIsInviteDialogOpen(false); 
    if (newInviteId) {
      const newLink = `${window.location.origin}/invite/${newInviteId}`;
      setInvitationLink(newLink);
    }
  };

  const handleCopyLink = () => {
    if (!invitationLink) return;
    navigator.clipboard.writeText(invitationLink).then(() => {
        toast({
            title: "Link Copied!",
            description: "The invitation link has been copied to your clipboard.",
        });
        setInvitationLink(null);
    }).catch(err => {
        console.error("Failed to copy link:", err);
        toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Could not copy the link. Please copy it manually.",
        });
    });
  };
  
  const handleRevoke = async () => {
    if (!invitationToRevoke) return;
    await revokeInvitation(invitationToRevoke.id, invitationToRevoke.auctionId, invitationToRevoke.acceptedBy);
    setInvitationToRevoke(null);
  };
  
  const getAuctionName = (auctionId: string) => {
    return auctions.find(a => a.id === auctionId)?.name || 'Unknown Auction';
  }

  const handleOpenExportDialog = (type: ExportType, title: string) => {
    setExportDialog({ isOpen: true, type, title });
  };
  
  const handleExport = async (selection: ExportSelection) => {
    if (!firestore || !accountId || !exportDialog) return;

    setIsProcessingExport(true);
    setExportDialog(null);

    try {
        const { type, auctionId } = selection;
        const allItems = (type === 'full' && (exportDialog.type !== 'donors' && exportDialog.type !== 'patrons')) ? await fetchAllItems() : [];

        // Attach auction names to items for 'all' exports
        if (type === 'full' && allItems.length > 0) {
            const auctionMap = new Map(auctions.map(a => [a.id, a.name]));
            allItems.forEach(item => (item as Item & { auctionName: string }).auctionName = auctionMap.get(item.auctionId) || 'N/A');
        }

        switch (exportDialog.type) {
            case 'donors':
                if (type === 'full') {
                    exportDonorsToCSV(donors);
                } else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    const donorIds = new Set(items.map(i => i.donorId).filter(Boolean));
                    const auctionDonors = donors.filter(d => donorIds.has(d.id!));
                    exportDonorsToCSV(auctionDonors, `donors_${getAuctionName(auctionId).replace(/\s+/g, '_').toLowerCase()}.csv`);
                }
                break;
            
            case 'items':
                if (type === 'full') {
                    exportAllItemsToCSV(allItems);
                } else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    exportItemsToCSV(items, getAuctionName(auctionId));
                }
                break;
            
            case 'reports':
                if (type === 'full') {
                    exportAllWinningBidsToCSV(allItems);
                } else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    exportWinningBidsToCSV(items, getAuctionName(auctionId));
                }
                break;
            
            case 'patrons':
                if (type === 'full') {
                    exportPatronsToCSV(patrons);
                } else if (auctionId) {
                    const auctionPatrons = await fetchRegisteredPatronsWithDetails(firestore, accountId, auctionId);
                    exportAuctionPatronsToCSV(auctionPatrons, getAuctionName(auctionId));
                }
                break;
            
            case 'donations':
                 if (type === 'full') {
                    exportAllDonationsToCSV(allItems);
                } else if (auctionId) {
                    const items = await fetchAuctionItems(firestore, accountId, auctionId);
                    exportDonationsToCSV(items, getAuctionName(auctionId));
                }
                break;
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

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Invite and manage roles for your team members.
            </CardDescription>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>Invite Manager</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a Manager</DialogTitle>
                <DialogDescription>
                  Enter the email of the user you want to invite and the auction they will manage.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <InviteManagerForm auctions={auctions} onSubmit={handleInviteSubmit} />
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
            {isLoadingInvitations ? (
              <div className="text-center text-muted-foreground py-8">Loading invitations...</div>
            ) : invitations.length > 0 ? (
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
                      <TableCell>{getAuctionName(invite.auctionId)}</TableCell>
                      <TableCell>
                        <Badge variant={invite.status === 'accepted' ? 'default' : 'secondary'} className="capitalize">
                          {invite.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => setInvitationToRevoke(invite)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                No managers have been invited yet.
              </div>
            )}
        </CardContent>
      </Card>
      
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
      
      <AlertDialog open={!!invitationToRevoke} onOpenChange={(isOpen) => !isOpen && setInvitationToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-bold">{invitationToRevoke?.email}</span>'s manager access from the auction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!invitationLink} onOpenChange={(isOpen) => !isOpen && setInvitationLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invitation Link Generated</AlertDialogTitle>
            <AlertDialogDescription>
              Share this unique link with the manager. They must use this link to accept the invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4 my-2 bg-muted rounded-md text-sm break-all font-mono">
            {invitationLink}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyLink}>
              Copy Link & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

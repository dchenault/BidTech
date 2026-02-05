'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Trash2, Upload } from 'lucide-react';
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
  exportWinningBidsToCSV,
  exportFullReportToCSV,
  exportAuctionPatronsToCSV,
  exportDonationsToCSV,
} from '@/lib/export';
import { ExportAuctionDialog } from '@/components/export-auction-dialog';
import { useInvitations } from '@/hooks/use-invitations';
import type { Invitation } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useAccount } from '@/hooks/use-account';
import { ImportCsvDialog } from '@/components/import-csv-dialog';

export default function SettingsPage() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportPatronsDialogOpen, setIsImportPatronsDialogOpen] = useState(false);
  const [isImportDonorsDialogOpen, setIsImportDonorsDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'items' | 'bids' | 'patrons' | 'donations' | null>(null);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<Invitation | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  
  const { auctions, isLoading: isLoadingAuctions } = useAuctions();
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

  const handleExportAllPatrons = () => {
    if (isLoadingPatrons) {
      toast({ title: "Please wait", description: "Patron data is still loading." });
      return;
    }
    exportPatronsToCSV(patrons);
  };

  const handleExportAllDonors = () => {
    if (isLoadingDonors) {
      toast({ title: "Please wait", description: "Donor data is still loading." });
      return;
    }
    exportDonorsToCSV(donors);
  };

  const handleOpenExportDialog = (type: 'items' | 'bids' | 'patrons' | 'donations') => {
    setExportType(type);
    setIsExportDialogOpen(true);
  };
  
  const handleRevoke = async () => {
    if (!invitationToRevoke) return;
    await revokeInvitation(invitationToRevoke.id, invitationToRevoke.auctionId, invitationToRevoke.acceptedBy);
    setInvitationToRevoke(null);
  };

  const handleAuctionExport = async (auctionId: string) => {
    if (!firestore || !accountId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection not available.' });
      return;
    }

    setIsExportDialogOpen(false);
    setIsProcessingExport(true);

    try {
      const selectedAuction = auctions.find(a => a.id === auctionId);
      if (!selectedAuction) {
        toast({ variant: 'destructive', title: 'Error', description: 'Auction not found.' });
        return;
      }
      
      if (exportType === 'patrons') {
        const auctionPatrons = await fetchRegisteredPatronsWithDetails(firestore, accountId, auctionId);
        exportAuctionPatronsToCSV(auctionPatrons, selectedAuction.name);
      } else {
        const items = await fetchAuctionItems(firestore, accountId, auctionId);
        if (exportType === 'items') {
          exportItemsToCSV(items, selectedAuction.name);
        } else if (exportType === 'bids') {
          exportWinningBidsToCSV(items, selectedAuction.name);
        } else if (exportType === 'donations') {
          exportDonationsToCSV(items, selectedAuction.name);
        }
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not fetch auction data for export.' });
    } finally {
      setIsProcessingExport(false);
    }
  };

  const handleFullReportExport = async () => {
    if (!firestore || !accountId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Database connection not available.' });
      return;
    }
    setIsProcessingExport(true);
    try {
      const allAuctionsWithItems = await Promise.all(
        auctions.map(async (auction) => {
          const items = await fetchAuctionItems(firestore, accountId, auction.id);
          return { ...auction, items };
        })
      );
      exportFullReportToCSV(allAuctionsWithItems);

    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not generate full report.' });
    } finally {
        setIsProcessingExport(false);
    }
  }
  
  const getAuctionName = (auctionId: string) => {
    return auctions.find(a => a.id === auctionId)?.name || 'Unknown Auction';
  }

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
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Button variant="outline" onClick={handleExportAllPatrons} disabled={isLoadingPatrons}>
              {isLoadingPatrons ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              All Patrons
            </Button>
            <Button variant="outline" onClick={handleExportAllDonors} disabled={isLoadingDonors}>
              {isLoadingDonors ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              All Donors
            </Button>
            <Button variant="outline" onClick={() => handleOpenExportDialog('items')} disabled={isProcessingExport}>
              <Download className="mr-2 h-4 w-4" />
              Auction Items
            </Button>
            <Button variant="outline" onClick={() => handleOpenExportDialog('patrons')} disabled={isProcessingExport}>
              <Download className="mr-2 h-4 w-4" />
              Auction Patrons
            </Button>
            <Button variant="outline" onClick={() => handleOpenExportDialog('bids')} disabled={isProcessingExport}>
              <Download className="mr-2 h-4 w-4" />
              Winning Bids
            </Button>
            <Button variant="outline" onClick={() => handleOpenExportDialog('donations')} disabled={isProcessingExport}>
              <Download className="mr-2 h-4 w-4" />
              Donations
            </Button>
             <Button variant="outline" onClick={handleFullReportExport} disabled={isProcessingExport}>
              {isProcessingExport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Full Auction Report
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

     <ExportAuctionDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        auctions={auctions}
        onSubmit={handleAuctionExport}
        title={`Export ${exportType === 'items' ? 'Items' : exportType === 'bids' ? 'Winning Bids' : exportType === 'donations' ? 'Donations' : 'Patrons'}`}
        description="Select an auction to export data from."
        isLoading={isLoadingAuctions}
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

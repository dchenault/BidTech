'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Gift, Users, Package, FilePieChart } from 'lucide-react';
import { useState } from 'react';
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
import type { Item } from '@/lib/types';
import { useAccount } from '@/hooks/use-account';
import { ImportCsvDialog } from '@/components/import-csv-dialog';
import { ExportDialog, type ExportSelection } from '@/components/export-dialog';
import { ImportItemsCsvDialog } from '@/components/import-items-csv-dialog';

type ExportType = 'donors' | 'items' | 'reports' | 'patrons' | 'donations';

export default function SettingsPage() {
  const [isImportPatronsDialogOpen, setIsImportPatronsDialogOpen] = useState(false);
  const [isImportDonorsDialogOpen, setIsImportDonorsDialogOpen] = useState(false);
  const [isImportItemsDialogOpen, setIsImportItemsDialogOpen] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [exportDialog, setExportDialog] = useState<{ isOpen: boolean; type: ExportType; title: string; } | null>(null);
  
  const { auctions, isLoading: isLoadingAuctions, fetchAllItems } = useAuctions();
  const { patrons, isLoading: isLoadingPatrons, importPatronsFromCSV } = usePatrons();
  const { donors, isLoading: isLoadingDonors, importDonorsFromCSV } = useDonors();
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { toast } = useToast();

  const handleOpenExportDialog = (type: ExportType, title: string) => {
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
            Bulk import items, patrons, or donors from a CSV file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Button variant="outline" onClick={() => setIsImportItemsDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Items
            </Button>
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

    <ImportItemsCsvDialog
        isOpen={isImportItemsDialogOpen}
        onClose={() => setIsImportItemsDialogOpen(false)}
        accountId={accountId!}
    />

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
    </>
  );
}

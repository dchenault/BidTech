'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useAccount } from '@/hooks/use-account';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Donor, Item, Auction } from '@/lib/types';

export default function DataCleanupPage() {
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleSyncItemsWithMasterDonors = async () => {
    if (!firestore || !accountId) return;
    setIsProcessing(true);
    setLogs([]);
    addLog('Starting Global Donor-to-Item Sync...');

    try {
      // 1. Fetch all Master Donors for this account
      addLog('Fetching master donor registry...');
      const donorsRef = collection(firestore, 'accounts', accountId, 'donors');
      const donorSnap = await getDocs(donorsRef);
      const donorMap = new Map<string, Donor>();
      donorSnap.docs.forEach(d => donorMap.set(d.id, { id: d.id, ...d.data() } as Donor));
      addLog(`Found ${donorMap.size} master donors.`);

      // 2. Fetch all Auctions for this account
      addLog('Scanning for auctions...');
      const auctionsRef = collection(firestore, 'accounts', accountId, 'auctions');
      const auctionSnap = await getDocs(auctionsRef);
      const auctionDocs = auctionSnap.docs;
      addLog(`Discovered ${auctionDocs.length} auctions.`);

      let totalUpdated = 0;

      // 3. Loop through each auction and its items
      for (const auctionDoc of auctionDocs) {
        const auctionId = auctionDoc.id;
        const auctionData = auctionDoc.data() as Auction;
        addLog(`Processing: ${auctionData.name}...`);

        const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionId, 'items');
        const itemsSnap = await getDocs(itemsRef);
        
        const batch = writeBatch(firestore);
        let auctionUpdateCount = 0;

        itemsSnap.docs.forEach(itemDoc => {
          const itemData = itemDoc.data() as Item;
          if (itemData.donorId && donorMap.has(itemData.donorId)) {
            const masterDonor = donorMap.get(itemData.donorId)!;
            
            // Check if nested donor object is stale
            const needsUpdate = 
                !itemData.donor || 
                itemData.donor.businessName !== masterDonor.businessName ||
                itemData.donor.firstName !== masterDonor.firstName ||
                itemData.donor.lastName !== masterDonor.lastName ||
                itemData.donor.name !== masterDonor.name ||
                itemData.donor.email !== masterDonor.email ||
                itemData.donor.phone !== masterDonor.phone;

            if (needsUpdate) {
              batch.update(itemDoc.ref, { donor: masterDonor });
              auctionUpdateCount++;
            }
          }
        });

        if (auctionUpdateCount > 0) {
          await batch.commit();
          totalUpdated += auctionUpdateCount;
          addLog(`Updated ${auctionUpdateCount} items in ${auctionData.name}.`);
        } else {
          addLog(`No stale items found in ${auctionData.name}.`);
        }
      }

      addLog(`CLEANUP COMPLETE. Updated ${totalUpdated} items across all catalogs.`);
      toast({ title: 'Cleanup Successful', description: `${totalUpdated} items synced with master donors.` });

    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
      toast({ variant: 'destructive', title: 'Cleanup Failed', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <CardTitle>Catalog Data Cleanup Utility</CardTitle>
          </div>
          <CardDescription>
            Ensures item records are using the most up-to-date donor information from your master registry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">What does this do?</p>
              This utility loops through every auction item in your account. If an item is linked to a donor, 
              it updates the item's internal donor object to match the current Master Donor Record. 
              This fixes stale business names, emails, and phone numbers in your exports.
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted px-4 py-2 text-xs font-bold uppercase border-b">Processing Log</div>
            <ScrollArea className="h-64 w-full p-4 font-mono text-xs bg-slate-950 text-green-400">
              {logs.length === 0 ? (
                <span className="text-slate-500 italic">Ready to process...</span>
              ) : (
                logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)
              )}
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => window.history.back()}>Cancel</Button>
          <Button onClick={handleSyncItemsWithMasterDonors} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Item-Donor Data
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

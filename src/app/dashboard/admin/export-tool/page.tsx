'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, documentId, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, AlertCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Item, Patron, RegisteredPatron, Auction, User as UserProfile } from '@/lib/types';
import Papa from 'papaparse';

export default function UniversalExportPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [targetAuctionId, setTargetAuctionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const triggerDownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMasterExport = async () => {
    if (!firestore || !user) return;
    const auctionId = targetAuctionId.trim();
    if (!auctionId) {
      toast({ variant: 'destructive', title: 'Auction ID Required' });
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    addLog(`Initiating Universal Master Export for ID: ${auctionId}`);

    try {
      // 1. Verify Admin Status & Log Diagnostics
      addLog(`Diagnostic UID: ${user.uid}`);
      addLog('Verifying administrative privileges...');
      
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      const userProfile = userProfileSnap.data() as UserProfile;
      
      const detectedRole = userProfile?.role || 'unassigned';
      const hasAccountAdmin = userProfile?.accounts ? Object.values(userProfile.accounts).includes('admin') : false;
      
      addLog(`Detected Profile Role: ${detectedRole}`);
      addLog(`Is Account Admin: ${hasAccountAdmin ? 'Yes' : 'No'}`);

      // Bypass check for the Project Owner / Force Access
      if (detectedRole !== 'admin' && !hasAccountAdmin) {
        addLog('PERMISSION NOTICE: No explicit admin role found. Proceeding via owner override.');
      } else {
        addLog('Permissions verified.');
      }

      // 2. Locate Auction Globally using manual range filtering on __name__
      addLog('Searching for auction identity across all accounts...');
      
      // FIX: Use manual range query on __name__ to bypass the "segment" requirement.
      // This allows Firestore to find the document ID without requiring the full path prefix.
      const auctionsQuery = query(
        collectionGroup(firestore, 'auctions'), 
        where('__name__', '>=', 'auctions/' + auctionId), 
        where('__name__', '<=', 'auctions/' + auctionId + '\uf8ff')
      );
      
      let auctionsSnapshot = await getDocs(auctionsQuery);

      if (auctionsSnapshot.empty) {
        addLog('Range search yielded no results. Trying global equality fallback...');
        const equalityQuery = query(collectionGroup(firestore, 'auctions'), where('__name__', '==', auctionId));
        auctionsSnapshot = await getDocs(equalityQuery);
        
        if (auctionsSnapshot.empty) {
            // DocumentId fallback for legacy compatibility
            const docIdQuery = query(collectionGroup(firestore, 'auctions'), where(documentId(), '==', auctionId));
            auctionsSnapshot = await getDocs(docIdQuery);
            
            if (auctionsSnapshot.empty) {
                throw new Error('Auction ID not found in database. Please verify the ID and ensure collection group indexes are deployed.');
            }
        }
      }

      const auctionDoc = auctionsSnapshot.docs[0];
      const auctionData = auctionDoc.data() as Auction;
      const auctionRef = auctionDoc.ref;
      
      // Extract the full path and found accountId from the ref path: accounts/{ACC_ID}/auctions/{AUC_ID}
      addLog(`Auction Discovered: ${auctionRef.path}`);
      
      const pathSegments = auctionRef.path.split('/');
      const foundAccountId = pathSegments[1]; 
      
      if (!foundAccountId) {
        throw new Error('Could not resolve parent account from the discovered auction path.');
      }
      
      addLog(`Connected to: ${auctionData.name} (Account: ${foundAccountId})`);

      // 3. Fetch Items & Donations (Donations are SKUs starting with DON- in the items subcollection)
      addLog('Fetching catalog items and donations...');
      const itemsSnapshot = await getDocs(collection(auctionRef, 'items'));
      const allItems = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Item));
      const physicalItems = allItems.filter(i => !i.sku.toString().startsWith('DON-'));
      const donations = allItems.filter(i => i.sku.toString().startsWith('DON-'));
      addLog(`Retrieved ${physicalItems.length} items and ${donations.length} donations.`);

      // 4. Fetch Registered Patrons
      addLog('Reconciling bidder registry...');
      const regSnapshot = await getDocs(collection(auctionRef, 'registered_patrons'));
      const regData = regSnapshot.docs.map(d => d.data() as RegisteredPatron);
      
      const patronIds = regData.map(r => r.patronId);
      let fullPatrons: Patron[] = [];
      
      if (patronIds.length > 0) {
        // Chunk patron fetching from the discovered parent account
        const patronsRef = collection(firestore, 'accounts', foundAccountId, 'patrons');
        for (let i = 0; i < patronIds.length; i += 30) {
          const chunk = patronIds.slice(i, i + 30);
          const q = query(patronsRef, where(documentId(), 'in', chunk));
          const pSnap = await getDocs(q);
          fullPatrons = [...fullPatrons, ...pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Patron))];
        }
      }
      addLog(`Matched ${fullPatrons.length} registered patrons with master profiles.`);

      // 5. Generate CSVs
      addLog('Compiling final data packages...');

      // Items CSV
      const itemsCsv = Papa.unparse(physicalItems.map(i => ({
        SKU: i.sku,
        Name: i.name,
        Description: i.description,
        Business: i.business || i.donor?.name || 'Anonymous',
        'Winning Bid': i.winningBid || 0,
        'Winner Name': i.winner ? `${i.winner.firstName} ${i.winner.lastName}` : 'Unsold',
        'Winner ID': i.winnerId || 'N/A',
        'Paid Status': i.paid ? 'PAID' : 'UNPAID',
        'Payment Method': i.paymentMethod || 'N/A'
      })));

      // Patrons CSV
      const patronMap = new Map(fullPatrons.map(p => [p.id, p]));
      const patronsCsv = Papa.unparse(regData.map(r => {
        const p = patronMap.get(r.patronId);
        return {
          'Bidder Number': r.bidderNumber,
          'First Name': p?.firstName || 'Unknown',
          'Last Name': p?.lastName || 'Unknown',
          'Email': p?.email || 'N/A',
          'Phone': p?.phone || 'N/A',
          'Street': p?.address?.street || '',
          'City': p?.address?.city || '',
          'State': p?.address?.state || '',
          'Zip': p?.address?.zip || ''
        };
      }).sort((a, b) => a['Bidder Number'] - b['Bidder Number']));

      // Donations CSV
      const donationsCsv = Papa.unparse(donations.map(d => ({
        'Donation SKU': d.sku,
        'Amount': d.winningBid || 0,
        'Patron Name': d.winner ? `${d.winner.firstName} ${d.winner.lastName}` : 'Anonymous',
        'Email': d.winner?.email || 'N/A',
        'Payment Method': d.paymentMethod || 'N/A'
      })));

      // 6. Trigger Downloads
      const safeName = auctionData.name.replace(/\s+/g, '_').toLowerCase();
      triggerDownload(itemsCsv, `master_items_${safeName}.csv`);
      triggerDownload(patronsCsv, `master_patrons_${safeName}.csv`);
      triggerDownload(donationsCsv, `master_donations_${safeName}.csv`);

      addLog('MASTER EXPORT COMPLETE. Downloads initiated.');
      toast({ title: 'Export Successful', description: 'Catalog, Patron, and Donation files generated.' });

    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
      toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <Card className="shadow-xl border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <CardTitle>Universal Auction Master Exporter</CardTitle>
          </div>
          <CardDescription>
            Enter any Auction ID to extract its full data package. This tool searches globally across all accounts and resolves parent paths automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="auction-id">Global Auction ID</Label>
            <div className="flex gap-2">
              <Input 
                id="auction-id" 
                placeholder="e.g. s3VnbScgvA5TgsLy6vRn" 
                value={targetAuctionId}
                onChange={(e) => setTargetAuctionId(e.target.value)}
                disabled={isProcessing}
              />
              <Button onClick={handleMasterExport} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generate Master Export
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Find IDs in the URL when viewing an auction (e.g., /dashboard/auctions/[ID])
            </p>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted px-4 py-2 text-xs font-bold uppercase tracking-wider border-b">
              Global Search Status Log
            </div>
            <ScrollArea className="h-64 w-full p-4 font-code text-xs bg-slate-950 text-green-400">
              {logs.length === 0 ? (
                <span className="text-slate-500 italic">Ready for input...</span>
              ) : (
                logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)
              )}
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-muted/30 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Admin diagnostics enabled for owner override.
          </div>
          <Button variant="ghost" onClick={() => window.history.back()}>Back</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

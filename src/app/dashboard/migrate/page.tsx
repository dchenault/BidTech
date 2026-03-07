
'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  DocumentData,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MigrationPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [oldAccountId, setOldAccountId] = useState('nBCLno0wwiW5rTGlJXPWBB72Wa02');
  const [oldAuctionId, setOldAuctionId] = useState('60saMmh0FFHI64Smw02O');
  const [newAccountId, setNewAccountId] = useState('I40v9Pk0nIe7rdtduWMctcaAfBv2');
  const [newAuctionId, setNewAuctionId] = useState('RUbRw3GDttETFouPLfqt');

  const [isMigrating, setIsMigrating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runMigration = async () => {
    if (!firestore) return;
    setIsMigrating(true);
    setLogs([]);
    addLog('Starting migration...');

    try {
      // 1. Migrate Auction Document
      addLog('Fetching source auction document...');
      const oldAuctionRef = doc(firestore, 'accounts', oldAccountId, 'auctions', oldAuctionId);
      const auctionSnap = await getDoc(oldAuctionRef);

      if (!auctionSnap.exists()) {
        throw new Error('Source auction not found.');
      }

      const auctionData = auctionSnap.data();
      const newAuctionRef = doc(firestore, 'accounts', newAccountId, 'auctions', newAuctionId);
      
      addLog(`Writing auction to destination: ${newAuctionId}`);
      await setDoc(newAuctionRef, {
        ...auctionData,
        accountId: newAccountId,
        id: newAuctionId,
      });

      // 2. Migrate Items
      addLog('Migrating items...');
      const itemsSnapshot = await getDocs(collection(oldAuctionRef, 'items'));
      addLog(`Found ${itemsSnapshot.size} items.`);
      for (const itemDoc of itemsSnapshot.docs) {
        const itemData = itemDoc.data();
        await setDoc(doc(newAuctionRef, 'items', itemDoc.id), {
          ...itemData,
          accountId: newAccountId,
          auctionId: newAuctionId,
        });
      }
      addLog('Items migration complete.');

      // 3. Migrate Lots
      addLog('Migrating lots...');
      const lotsSnapshot = await getDocs(collection(oldAuctionRef, 'lots'));
      addLog(`Found ${lotsSnapshot.size} lots.`);
      for (const lotDoc of lotsSnapshot.docs) {
        const lotData = lotDoc.data();
        await setDoc(doc(newAuctionRef, 'lots', lotDoc.id), {
          ...lotData,
          accountId: newAccountId,
          auctionId: newAuctionId,
        });
      }
      addLog('Lots migration complete.');

      // 4. Migrate Registered Patrons
      addLog('Migrating registered patrons...');
      const regPatronsSnapshot = await getDocs(collection(oldAuctionRef, 'registered_patrons'));
      addLog(`Found ${regPatronsSnapshot.size} registered patrons.`);
      for (const regDoc of regPatronsSnapshot.docs) {
        const regData = regDoc.data();
        await setDoc(doc(newAuctionRef, 'registered_patrons', regDoc.id), {
          ...regData,
          accountId: newAccountId,
          auctionId: newAuctionId,
        });
      }
      addLog('Registered patrons migration complete.');

      // 5. Migrate Master Patrons List
      addLog('Migrating account patrons...');
      const oldPatronsRef = collection(firestore, 'accounts', oldAccountId, 'patrons');
      const patronsSnapshot = await getDocs(oldPatronsRef);
      addLog(`Found ${patronsSnapshot.size} patrons in account.`);
      for (const patronDoc of patronsSnapshot.docs) {
        const patronData = patronDoc.data();
        await setDoc(doc(firestore, 'accounts', newAccountId, 'patrons', patronDoc.id), {
          ...patronData,
          accountId: newAccountId,
        });
      }
      addLog('Patrons migration complete.');

      // 6. Migrate Master Donors List
      addLog('Migrating account donors...');
      const oldDonorsRef = collection(firestore, 'accounts', oldAccountId, 'donors');
      const donorsSnapshot = await getDocs(oldDonorsRef);
      addLog(`Found ${donorsSnapshot.size} donors in account.`);
      for (const donorDoc of donorsSnapshot.docs) {
        const donorData = donorDoc.data();
        await setDoc(doc(firestore, 'accounts', newAccountId, 'donors', donorDoc.id), {
          ...donorData,
          accountId: newAccountId,
        });
      }
      addLog('Donors migration complete.');

      addLog('MIGRATION SUCCESSFUL!');
      toast({
        title: 'Migration Complete',
        description: 'The auction data has been successfully moved.',
      });
    } catch (error: any) {
      addLog(`ERROR: ${error.message}`);
      toast({
        variant: 'destructive',
        title: 'Migration Failed',
        description: error.message,
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            <CardTitle>One-Time Data Migration Utility</CardTitle>
          </div>
          <CardDescription>
            Move an auction and all its subcollections between accounts. This tool will rewrite the accountId and auctionId fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-muted-foreground uppercase text-xs">Source (Old)</h3>
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input value={oldAccountId} onChange={(e) => setOldAccountId(e.target.value)} placeholder="Old Account ID" />
              </div>
              <div className="space-y-2">
                <Label>Auction ID</Label>
                <Input value={oldAuctionId} onChange={(e) => setOldAuctionId(e.target.value)} placeholder="Old Auction ID" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-primary uppercase text-xs">Destination (New)</h3>
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input value={newAccountId} onChange={(e) => setNewAccountId(e.target.value)} placeholder="New Account ID" />
              </div>
              <div className="space-y-2">
                <Label>Auction ID</Label>
                <Input value={newAuctionId} onChange={(e) => setNewAuctionId(e.target.value)} placeholder="New Auction ID" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Migration Logs</h3>
            <ScrollArea className="h-[300px] w-full rounded-md border bg-slate-950 p-4 font-mono text-sm text-green-400">
              {logs.length === 0 ? (
                <span className="text-slate-500 italic">Ready to start migration...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground max-w-md">
            Warning: This action writes significant amounts of data. Ensure the destination IDs are correct.
          </p>
          <Button 
            size="lg" 
            onClick={runMigration} 
            disabled={isMigrating}
            className="w-[200px]"
          >
            {isMigrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                Start Migration
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

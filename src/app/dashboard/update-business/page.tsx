'use client';

import { useState, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useAccount } from '@/hooks/use-account';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Database, CheckCircle2, AlertCircle, Upload, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Papa from 'papaparse';

const BUSINESS_MAPPING: Record<string, string> = {
  "B1": "Jerry Mitchell",
  "B2": "Jerry Mitchell",
  "B3": "Jerry Mitchell",
  "B4": "Jerry Mitchell",
  "B5": "Janet and Patty Dose",
  "B6": "Casa de Oro",
  "B7": "Gage Waller",
  "B8": "Valley Powersports",
  "B9": "Ryke Wilson",
  "B10": "Carousel",
  "B11": "SpitFire Desserts",
  "B12": "Wildcat Pizza",
  "B13": "Gary & Tashia Dose",
  "B14": "Gary & Tashia Dose",
  "B15": "Naomi Miller",
  "B16": "David and Karena Dose",
  "C1": "Dave & Kim Gabrielson",
  "C2": "Dave & Kim Gabrielson",
  "C3": "Dave & Kim Gabrielson",
  "C4": "Dave & Kim Gabrielson",
  "C5": "Dave & Kim Gabrielson",
  "C6": "Dave & Kim Gabrielson",
  "G1": "Goose N the Tree Cafe",
  "G2": "Humdinger Drive In",
  "G3": "SpitFire Desserts",
  "G4": "Tall Pine",
  "G5": "Jack",
  "G6": "North Idaho Trading",
  "G7": "North Idaho Trading",
  "G8": "Ryke Wilson",
  "G9": "Rise and Shine Bakery",
  "G10": "Rise and Shine Bakery",
  "G11": "Rise and Shine Bakery",
  "G12": "Rise and Shine Bakery",
  "G13": "Rise and Shine Bakery",
  "G14": "Janet and Patty Dose",
  "G15": "Janet and Patty Dose",
  "L1": "Janet and Patty Dose",
  "L2": "Ryke Wilson",
  "L3": "Ryke Wilson",
  "L4": "Mark & Heidi Miller",
  "L5": "Yvonne & Rusty Matheny",
  "L6": "Yvonne & Rusty Matheny",
  "L7": "Jaycie Miller",
  "L8": "Jaycie Miller",
  "L9": "Stevens Supply",
  "L10": "Aspen Peak",
  "L11": "Ryke Wilson",
  "L12": "Dave & Kim Gabrielson",
  "L13": "CarolAnn & Philip Hill",
  "L14": "Dwayne and Crystal L",
  "L15": "Ashley and Joe Wilson",
  "L16": "Rob & Danielle Rhoad",
  "L17": "Lost Resort Vacation",
  "L18": "Dave & Kim Gabrielson",
  "L19": "Ember",
  "L20": "Ember",
  "L21": "Stickley",
  "L22": "Stickley",
  "L23": "Kim Holmes",
  "L24": "Gage Waller",
  "L25": "Gage Waller",
  "L26": "Naomi",
  "L27": "Union Coffee / Casa de Oro",
  "L28": "Gary & Tashia Dose",
  "L29": "Happy Heart Photography",
  "L30": "Bob & Beth Otto",
  "L31": "Bob & Beth Otto",
  "L32": "Patriot Electric",
  "L33": "Ryke",
  "L34": "Ryke",
  "L35": "Ryke",
  "L36": "Ryke",
  "L37": "Ryke",
  "L38": "Ron Wayne Consulting",
  "L39": "Rob & Cynna Harcher",
  "L40": "Aaron and Amy Miller",
  "L41": "Rudolph Miller",
  "L42": "Yvonne & Rusty Matheny",
  "L43": "Yvonne & Rusty Matheny",
  "L44": "Will Miller",
  "L45": "Tyler & Beth Chubb",
  "L46": "Ryan & Larisa Toliver",
  "L47": "Gary & Tashia Dose",
  "L48": "Aleah Chambers",
  "L49": "Aleah Chambers",
  "L50": "Yvonne & Rusty Matheny",
  "L51": "Scott and Jen Stevens",
  "L52": "Scott and Jen Stevens",
  "L53": "Julia and Levi Wilson",
  "L54": "Serenity Clark",
  "L55": "Serenity Clark",
  "L56": "Serenity Clark",
  "L57": "Dwayne and Crystal L",
  "L58": "Dwayne and Crystal L",
  "L59": "Dwayne and Crystal L",
  "L60": "Dwayne and Crystal L",
  "L61": "Andy & Shari Peak",
  "L62": "Dave & Kim Gabrielson",
  "L63": "Dave & Kim Gabrielson",
  "L64": "Russ and Kari Rumbaugh",
  "L65": "Joshua Miller",
  "L66": "Charlene & Bill Larue",
  "L67": "Charlene & Bill Larue",
  "L68": "Lucy Hardy",
  "L69": "Erik & Melissa Peake",
  "L70": "Country Barn Bed & T",
  "L71": "Rocky Mountain Retr",
  "L72": "Daniel Dose",
  "L73": "Elias Hardy",
  "L74": "Elias Hardy",
  "L75": "Ron Wayne Consulting",
  "L76": "Gary & Tashia Dose",
  "L77": "Gary & Tashia Dose",
  "L78": "Country Meats",
  "L79": "Ryan & Larisa Toliver",
  "L80": "SpitFire Desserts",
  "L81": "SpitFire Desserts",
  "L82": "Ryan & Larisa Toliver",
  "L83": "Eileen Shady",
  "L84": "Janet and Patty Dose",
  "L85": "Janet and Patty Dose",
  "R1": "Western States",
  "R2": "Building Maintenance",
  "R3": "Janet and Patty Dose",
  "R4": "Matt & Jill Palmer",
  "R5": "Janet and Patty Dose",
  "R6": "NRCT",
  "R8": "Jerry and Trecia Brown",
  "R9": "Janet and Patty Dose",
  "R10": "Bill & Bobby Meaus",
  "R11": "Jerry and Trecia Brown",
  "R12": "Kellogg Pet Medical C",
  "Y1": "Janet and Patty Dose",
  "Y2": "Cindy Withers",
  "Y3": "Cindy Withers",
  "Y4": "Karen Hasell",
  "Y5": "Karen Hasell",
  "Y6": "Laura Sue Miller",
  "Y7": "Marion Fendrick",
  "Y8": "Sarah Kirkman",
  "Y9": "Sarah Kirkman",
  "Y10": "Sarah Kirkman",
  "Y11": "Sarah Kirkman",
  "Y12": "Sarah Kirkman",
  "Y13": "Lantern Lights & Wee",
  "Y14": "NRCT",
  "Y15": "NRCT",
  "Y16": "NRCT",
  "Y17": "Laura Sue Miller"
};

const TARGET_AUCTION_ID = 's3VnbScgvA5TgsLy6vRn';

export default function UpdateBusinessPage() {
  const firestore = useFirestore();
  const { accountId } = useAccount();
  const { toast } = useToast();
  const [isUpdating, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsvData, setParsedCsvData] = useState<Record<string, string> | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const mapping: Record<string, string> = {};
          let skuKey = '';
          let businessKey = '';

          // Look for likely column headers
          if (results.meta.fields) {
            skuKey = results.meta.fields.find(f => f.toLowerCase().includes('sku')) || '';
            businessKey = results.meta.fields.find(f => f.toLowerCase().includes('business') || f.toLowerCase().includes('donor')) || '';
          }

          if (!skuKey || !businessKey) {
            toast({
              variant: 'destructive',
              title: 'Invalid CSV',
              description: 'Could not find "SKU" and "Business" columns. Please check your headers.'
            });
            return;
          }

          results.data.forEach((row: any) => {
            if (row[skuKey] && row[businessKey]) {
              mapping[row[skuKey].toString().trim()] = row[businessKey].toString().trim();
            }
          });

          setParsedCsvData(mapping);
          toast({ title: 'CSV Parsed', description: `Found ${Object.keys(mapping).length} items to update.` });
        }
      });
    }
  };

  const downloadTemplate = async () => {
    if (!firestore || !accountId) return;
    setIsProcessing(true);
    addLog('Generating template from current auction items...');

    try {
      const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', TARGET_AUCTION_ID, 'items');
      const snapshot = await getDocs(itemsRef);
      
      const data = snapshot.docs.map(doc => ({
        SKU: doc.data().sku,
        ItemName: doc.data().name,
        Business: doc.data().business || ''
      }));

      // Sort by SKU naturally
      data.sort((a, b) => a.SKU.toString().localeCompare(b.SKU.toString(), undefined, { numeric: true }));

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `auction_business_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addLog('Template downloaded successfully.');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download Failed', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!firestore || !accountId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No database connection or account found.' });
      return;
    }

    const mappingToUse = parsedCsvData || BUSINESS_MAPPING;
    const isCsv = !!parsedCsvData;

    setIsProcessing(true);
    setLogs([]);
    addLog(`Starting update using ${isCsv ? 'uploaded CSV' : 'hardcoded mapping'}...`);
    addLog(`Targeting auction: ${TARGET_AUCTION_ID}`);

    try {
      const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', TARGET_AUCTION_ID, 'items');
      const snapshot = await getDocs(itemsRef);
      
      if (snapshot.empty) {
        throw new Error('No items found in this auction.');
      }

      addLog(`Found ${snapshot.size} items in auction. Processing matches...`);
      
      const batch = writeBatch(firestore);
      let matchCount = 0;
      let missingCount = 0;

      snapshot.docs.forEach(itemDoc => {
        const itemData = itemDoc.data();
        const sku = itemData.sku?.toString().trim();
        
        if (sku && mappingToUse[sku]) {
          batch.update(itemDoc.ref, { business: mappingToUse[sku] });
          matchCount++;
        } else {
          missingCount++;
        }
      });

      if (matchCount > 0) {
        addLog(`Applying updates to ${matchCount} items...`);
        await batch.commit();
        addLog(`SUCCESS: Updated ${matchCount} items.`);
        if (missingCount > 0) addLog(`NOTE: ${missingCount} items in auction did not have a match in the update list.`);
        
        toast({ title: 'Success!', description: `Updated ${matchCount} items with business names.` });
      } else {
        addLog('ERROR: No matching SKUs found between your list and the auction.');
        toast({ variant: 'default', title: 'No Changes', description: 'None of the items in this auction matched the SKUs in your provided list.' });
      }

    } catch (e: any) {
      console.error(e);
      addLog(`ERROR: ${e.message}`);
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card className="shadow-lg border-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <CardTitle>Bulk Business Name Update</CardTitle>
          </div>
          <CardDescription>
            Match SKUs in Auction <strong>{TARGET_AUCTION_ID}</strong> 
            and update them with donor business names.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Step 1: Get your data</Label>
              <Button variant="outline" onClick={downloadTemplate} disabled={isUpdating} className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Download Current Item List (CSV)
              </Button>
              <p className="text-xs text-muted-foreground">
                Edit the "Business" column in the downloaded file and save it.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="csv-upload">Step 2: Upload revised data</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="csv-upload" 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  disabled={isUpdating}
                  className="flex-1"
                />
                {parsedCsvData && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Pre-flight Status
            </h3>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Mode: <strong>{parsedCsvData ? 'CSV Revision' : 'Legacy Hardcoded'}</strong></li>
              <li>• SKUs in Queue: {Object.keys(parsedCsvData || BUSINESS_MAPPING).length}</li>
              <li>• Action: Update field <code>business</code> on match</li>
            </ul>
          </div>

          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-40 w-full p-4 font-mono text-xs bg-slate-950 text-green-400">
              {logs.length === 0 ? (
                <span className="text-slate-500 italic">Logs will appear here once you run the update...</span>
              ) : (
                logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => window.history.back()}>Back</Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {parsedCsvData ? 'Run CSV Update' : 'Run Legacy Update'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

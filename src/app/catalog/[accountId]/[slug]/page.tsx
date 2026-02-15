
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import type { Auction, Item, Lot } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Search, ArrowUp, ArrowDown, ImageIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const ItemsTable = ({ items, requestSort, renderSortArrow }: { items: Item[], requestSort: (key: string) => void, renderSortArrow: (key: string) => React.ReactNode }) => {
    if (items.length === 0) {
        return (
            <div className="h-24 text-center content-center text-muted-foreground">
                No items in this section.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('sku')} className="-ml-4">SKU {renderSortArrow('sku')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('name')} className="-ml-4">Name {renderSortArrow('name')}</Button></TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('category')} className="-ml-4">Category {renderSortArrow('category')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('donor')} className="-ml-4">Donated By {renderSortArrow('donor')}</Button></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="relative h-20 w-20 bg-muted rounded-md flex items-center justify-center">
                              {item.thumbnailUrl ? (
                                <Image
                                  alt={item.name}
                                  className="aspect-square rounded-md object-cover"
                                  fill
                                  src={item.thumbnailUrl}
                                />
                              ) : (
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{item.description}</TableCell>
                        <TableCell><Badge variant="outline">{item.category.name}</Badge></TableCell>
                        <TableCell>{item.donor?.name || 'N/A'}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default function PublicCatalogPage() {
  const params = useParams();
  const firestore = useFirestore();

  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const [auction, setAuction] = useState<Auction | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'sku', direction: 'ascending' });

  useEffect(() => {
    if (!firestore || !accountId || !slug) {
        setIsLoading(false);
        setError("Invalid URL.");
        return;
    };

    const fetchAuctionData = async () => {
      setIsLoading(true);
      try {
        const auctionsRef = collection(firestore, 'accounts', accountId, 'auctions');
        const q = query(auctionsRef, where('slug', '==', slug), where('isPublic', '==', true));
        const auctionSnapshot = await getDocs(q);

        if (auctionSnapshot.empty) {
          throw new Error('This auction catalog is not public or does not exist.');
        }

        const auctionDoc = auctionSnapshot.docs[0];
        const fetchedAuction = { id: auctionDoc.id, ...auctionDoc.data() } as Auction;
        setAuction(fetchedAuction);

        const itemsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionDoc.id, 'items');
        const lotsRef = collection(firestore, 'accounts', accountId, 'auctions', auctionDoc.id, 'lots');

        const [itemsSnapshot, lotsSnapshot] = await Promise.all([
            getDocs(itemsRef),
            getDocs(lotsRef)
        ]);

        const fetchedItems = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)).filter(item => !item.sku.toString().startsWith('DON-')); // Filter out donations
        setItems(fetchedItems);
        
        const fetchedLots = lotsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lot));
        setLots(fetchedLots);

      } catch (e: any) {
        setError(e.message || 'Failed to load auction data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctionData();
  }, [firestore, accountId, slug]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedAndSearchedItems = useMemo(() => {
    let sortableItems = [...items];
    
    if (searchQuery) {
        sortableItems = sortableItems.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            item.sku.toString().includes(searchQuery) ||
            item.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.donor?.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (sortConfig) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
            case 'category':
                aValue = a.category?.name.toLowerCase() || '';
                bValue = b.category?.name.toLowerCase() || '';
                break;
            case 'donor':
                aValue = a.donor?.name.toLowerCase() || '';
                bValue = b.donor?.name.toLowerCase() || '';
                break;
            default:
                aValue = a[sortConfig.key as keyof Item];
                bValue = b[sortConfig.key as keyof Item];
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        }

        aValue = aValue ?? (typeof aValue === 'number' ? 0 : '');
        bValue = bValue ?? (typeof bValue === 'number' ? 0 : '');

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, searchQuery, sortConfig]);

  const { liveItems, silentItemsByLot } = useMemo(() => {
    const live: Item[] = [];
    const silent = new Map<string, Item[]>();

    sortedAndSearchedItems.forEach(item => {
      if (item.lotId) {
        if (!silent.has(item.lotId)) {
          silent.set(item.lotId, []);
        }
        silent.get(item.lotId)!.push(item);
      } else {
        live.push(item);
      }
    });

    return { liveItems: live, silentItemsByLot: silent };
  }, [sortedAndSearchedItems]);

  const renderSortArrow = (key: string) => {
    if (sortConfig?.key === key) {
        return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    }
    return null;
  }
  
  const renderLiveItems = () => (
      <Card>
        <CardHeader>
            <CardTitle>Live Auction Items</CardTitle>
            <CardDescription>Items available in the live portion of the auction.</CardDescription>
        </CardHeader>
        <CardContent>
            <ItemsTable items={liveItems} requestSort={requestSort} renderSortArrow={renderSortArrow} />
        </CardContent>
      </Card>
  );
  
  const renderSilentItems = () => (
    <div className="space-y-6">
        {lots.map(lot => {
            const lotItems = silentItemsByLot.get(lot.id) || [];
            if (lotItems.length === 0 && searchQuery) return null; // Hide empty lots when searching

            return (
                <Card key={lot.id}>
                    <CardHeader>
                        <CardTitle>{lot.name}</CardTitle>
                        <CardDescription>{lotItems.length} item(s) in this lot.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ItemsTable items={lotItems} requestSort={requestSort} renderSortArrow={renderSortArrow} />
                    </CardContent>
                </Card>
            );
        })}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="text-center text-destructive py-10">
            <h2 className="text-2xl font-bold">Error</h2>
            <p>{error}</p>
        </div>
      </div>
    );
  }

  const hasLiveItems = liveItems.length > 0;
  const hasSilentItems = silentItemsByLot.size > 0;
  const isHybrid = auction?.type === 'Hybrid' && hasLiveItems && hasSilentItems;

  return (
    <>
    <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto px-4 md:px-6 py-6 space-y-4">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">{auction?.name}</h1>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{auction?.description}</p>
                <p className="text-sm text-muted-foreground">Auction Date: {new Date(auction?.startDate || '').toLocaleDateString()}</p>
            </div>
            
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search all items..."
                    className="w-full rounded-lg bg-muted pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
    </div>
    
    <div className="container mx-auto px-4 md:px-6 py-8 flex-1">
        {isHybrid ? (
            <Tabs defaultValue="live">
                <div className="flex justify-center mb-4">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="live">Live Items</TabsTrigger>
                        <TabsTrigger value="silent">Silent Items</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="live" className="mt-4">
                    {renderLiveItems()}
                </TabsContent>
                <TabsContent value="silent" className="mt-4">
                    {renderSilentItems()}
                </TabsContent>
            </Tabs>
        ) : (
            <div className="space-y-6">
                {hasLiveItems && renderLiveItems()}
                {hasSilentItems && renderSilentItems()}
            </div>
        )}

        {sortedAndSearchedItems.length === 0 && (
             <div className="text-center text-muted-foreground py-10">
                <h3 className="text-lg font-semibold">No Items Found</h3>
                <p>There are no items matching your search criteria in this auction.</p>
            </div>
        )}
    </div>
    </>
  );
}

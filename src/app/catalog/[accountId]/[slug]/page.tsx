'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
import { formatCurrency } from '@/lib/utils';
import { Loader2, Search, ArrowUp, ArrowDown } from 'lucide-react';
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
                    <TableHead className="w-[80px]">
                        <Button variant="ghost" onClick={() => requestSort('sku')} className="-ml-4 h-8 px-2 font-bold text-foreground">
                            # {renderSortArrow('sku')}
                        </Button>
                    </TableHead>
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('name')} className="-ml-4 h-8 px-2 text-foreground">
                            Item {renderSortArrow('name')}
                        </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Value/Bid</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-bold text-lg">{item.sku}</TableCell>
                        <TableCell>
                            <div className="font-semibold text-base">{item.name}</div>
                            <div className="md:hidden text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-md">
                            {item.description}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg text-primary whitespace-nowrap">
                            {formatCurrency(item.winningBid || item.estimatedValue)}
                        </TableCell>
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
        const itemsSnapshot = await getDocs(itemsRef);

        const fetchedItems = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)).filter(item => !item.sku.toString().startsWith('DON-')); // Filter out donations
        setItems(fetchedItems);

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
            item.sku.toString().includes(searchQuery)
        );
    }

    if (sortConfig) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
            case 'sku':
                const res = a.sku.toString().localeCompare(b.sku.toString(), undefined, { numeric: true, sensitivity: 'base' });
                return sortConfig.direction === 'ascending' ? res : -res;
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

  const { liveItems, silentItems } = useMemo(() => {
    const live: Item[] = [];
    const silent: Item[] = [];

    sortedAndSearchedItems.forEach(item => {
      if (item.lotId) {
        silent.push(item);
      } else {
        live.push(item);
      }
    });

    return { liveItems: live, silentItems: silent };
  }, [sortedAndSearchedItems]);

  const renderSortArrow = (key: string) => {
    if (sortConfig?.key === key) {
        return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
    }
    return null;
  }

  const getFormattedDate = (dateInput: any, options: Intl.DateTimeFormatOptions) => {
    if (!dateInput) return '';
    try {
        const date = (typeof dateInput.toDate === 'function') ? dateInput.toDate() : new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return '';
    }
  };
  
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
    <Card>
        <CardHeader>
            <CardTitle>Silent Auction Items</CardTitle>
            <CardDescription>All items available for silent bidding.</CardDescription>
        </CardHeader>
        <CardContent>
            <ItemsTable items={silentItems} requestSort={requestSort} renderSortArrow={renderSortArrow} />
        </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
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
  const hasSilentItems = silentItems.length > 0;
  const isHybrid = auction?.type === 'Hybrid' && hasLiveItems && hasSilentItems;

  return (
    <>
    <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto px-4 md:px-6 py-6 space-y-4">
            <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{auction?.name}</h1>
                {auction?.description && <p className="text-base text-muted-foreground max-w-3xl mx-auto">{auction?.description}</p>}
                <p className="text-sm font-medium text-muted-foreground">Auction Date: {getFormattedDate(auction?.startDate, { dateStyle: 'long' })}</p>
            </div>
            
            <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by #, name, or description..."
                    className="w-full rounded-full bg-muted pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
    </div>
    
    <div className="container mx-auto px-4 md:px-6 py-8 flex-1">
        {isHybrid ? (
            <Tabs defaultValue="live">
                <div className="flex justify-center mb-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="live">Live Items ({liveItems.length})</TabsTrigger>
                        <TabsTrigger value="silent">Silent Items ({silentItems.length})</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="live" className="mt-0">
                    {renderLiveItems()}
                </TabsContent>
                <TabsContent value="silent" className="mt-0">
                    {renderSilentItems()}
                </TabsContent>
            </Tabs>
        ) : (
            <div className="space-y-8">
                {hasLiveItems && renderLiveItems()}
                {hasSilentItems && renderSilentItems()}
            </div>
        )}

        {sortedAndSearchedItems.length === 0 && (
             <div className="text-center text-muted-foreground py-20">
                <h3 className="text-lg font-semibold">No Items Found</h3>
                <p>There are no items matching your search criteria.</p>
            </div>
        )}
    </div>
    </>
  );
}

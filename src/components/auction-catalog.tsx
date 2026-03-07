
"use client";

import { useMemo } from 'react';
import type { Auction, Item } from '@/lib/types';

interface AuctionCatalogProps {
  auction: Auction;
}

export function AuctionCatalog({ auction }: AuctionCatalogProps) {
  const sortedItems = useMemo(() => {
    if (!auction.items) return [];
    const nonDonations = auction.items.filter(item => !item.sku.toString().startsWith('DON-'));
    
    // Pass 1: Strictly Numeric SKUs
    const numericItems = nonDonations.filter(item => /^\d+$/.test(item.sku.toString()));
    // Pass 2: Lots or Alpha-Numeric SKUs
    const alphaItems = nonDonations.filter(item => !/^\d+$/.test(item.sku.toString()));

    const sorter = (a: Item, b: Item) => 
        a.sku.toString().localeCompare(b.sku.toString(), undefined, { numeric: true, sensitivity: 'base' });

    return [...numericItems.sort(sorter), ...alphaItems.sort(sorter)];
  }, [auction.items]);

  const formattedStartDate = useMemo(() => {
    if (!auction.startDate) return '';
    const date = typeof (auction.startDate as any).toDate === 'function' 
        ? (auction.startDate as any).toDate() 
        : new Date(auction.startDate);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
  }, [auction.startDate]);

  return (
    <div className="p-8 bg-white text-black font-sans min-h-screen">
      <header className="mb-10 text-center border-b-4 border-black pb-8">
        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">{auction.name}</h1>
        {auction.description && (
            <p className="text-xl text-gray-700 italic mb-4 max-w-3xl mx-auto">{auction.description}</p>
        )}
        <p className="text-xl font-bold">{formattedStartDate}</p>
      </header>

      <main>
        <table className="w-full border-collapse">
            <thead>
            <tr className="border-b-4 border-black">
                <th className="text-left py-4 px-2 w-24 text-xl">SKU</th>
                <th className="text-left py-4 px-2 text-xl">Item & Donor</th>
                <th className="text-left py-4 px-2 text-xl">Description</th>
                <th className="text-left py-4 px-2 w-48 text-xl border-l-2 border-black">Winning Bid Info</th>
            </tr>
            </thead>
            <tbody>
            {sortedItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-300 page-break-inside-avoid">
                <td className="py-6 px-2 font-black text-3xl align-top">{item.sku}</td>
                <td className="py-6 px-2 align-top">
                    <div className="font-bold text-2xl mb-1">{item.name}</div>
                    {item.donor?.name && (
                    <div className="text-lg text-gray-600 italic">Donated by: {item.donor.name}</div>
                    )}
                </td>
                <td className="py-6 px-2 align-top text-lg leading-relaxed">{item.description}</td>
                <td className="py-6 px-2 align-top border-l-2 border-gray-300 bg-gray-50/50"></td>
                </tr>
            ))}
            </tbody>
        </table>
      </main>

       <style jsx global>{`
            @media print {
                .page-break-inside-avoid {
                    page-break-inside: avoid;
                }
                body {
                    -webkit-print-color-adjust: exact;
                }
                @page {
                    margin: 0.5in;
                }
            }
        `}</style>
    </div>
  );
}

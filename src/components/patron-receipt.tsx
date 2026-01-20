
"use client";

import type { Patron, Item, Auction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import React from 'react';

interface PatronReceiptProps {
  patron: Patron;
  items: Item[];
  auction: Auction;
}

export const PatronReceipt = React.forwardRef<HTMLDivElement, PatronReceiptProps>(({ patron, items, auction }, ref) => {
  const totalSpent = items.reduce((sum, item) => sum + (item.winningBid || 0), 0);

  return (
    <div ref={ref} className="p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold">Thank You!</h1>
        <p className="text-lg text-gray-600">Receipt for your winnings from {auction.name}</p>
      </header>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Receipt For:</h2>
        <p className="text-lg font-bold">{patron.firstName} {patron.lastName}</p>
        <p className="text-md text-gray-700">{patron.address?.street}</p>
        <p className="text-md text-gray-700">{patron.address?.city}, {patron.address?.state} {patron.address?.zip}</p>
        <p className="text-md text-gray-700">{patron.email}</p>
      </section>

      <main>
        <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Items Won</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-2 border-b-2 border-gray-800">Item #</th>
              <th className="p-2 border-b-2 border-gray-800">Item Name</th>
              <th className="p-2 border-b-2 border-gray-800 text-right">Winning Bid</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="p-2 border-b">{item.sku}</td>
                <td className="p-2 border-b">{item.name}</td>
                <td className="p-2 border-b text-right font-mono">{formatCurrency(item.winningBid || 0)}</td>
              </tr>
            ))}
            <tr className="font-bold text-lg">
                <td colSpan={2} className="p-2 pt-4 text-right">Total:</td>
                <td className="p-2 pt-4 text-right font-mono">{formatCurrency(totalSpent)}</td>
            </tr>
          </tbody>
        </table>
      </main>

      <footer className="mt-12 text-center text-gray-600">
        <p>We sincerely thank you for your generous support of {auction.name}.</p>
      </footer>
    </div>
  );
});

PatronReceipt.displayName = 'PatronReceipt';

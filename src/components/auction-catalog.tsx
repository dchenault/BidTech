
"use client";

import type { Auction, Item } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface AuctionCatalogProps {
  auction: Auction;
}

const renderItemRow = (item: Item) => (
    <tr key={item.id} className="item-row">
        <td className="image-cell">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.name} className="thumbnail" />
          ) : null}
        </td>
        <td className="sku-cell">{item.sku}</td>
        <td className="name-cell">{item.name}</td>
        <td className="description-cell">{item.description}</td>
        <td className="value-cell">Estimated Value: {formatCurrency(item.estimatedValue)}</td>
        <td className="notes-cell"></td>
    </tr>
);

const renderCategoryGroup = (categoryName: string, items: Item[]) => (
    <tbody key={categoryName}>
        <tr>
            <td colSpan={6} className="category-header">
                <h3>Category: {categoryName}</h3>
            </td>
        </tr>
        {items.map(renderItemRow)}
    </tbody>
);


export function AuctionCatalog({ auction }: AuctionCatalogProps) {
  const lotsById = new Map((auction.lots || []).map(l => [l.id, l.name]));

  const { liveItemsByCategory, silentItemsByLotThenCategory } = (auction.items || [])
    .filter(item => !item.sku.toString().startsWith('DON-'))
    .reduce((acc, item) => {
      const categoryName = item.category?.name || 'Uncategorized';
      if (item.lotId) {
        const lotName = lotsById.get(item.lotId) || 'Unassigned Silent Items';
        if (!acc.silentItemsByLotThenCategory[lotName]) {
          acc.silentItemsByLotThenCategory[lotName] = {};
        }
        if (!acc.silentItemsByLotThenCategory[lotName][categoryName]) {
          acc.silentItemsByLotThenCategory[lotName][categoryName] = [];
        }
        acc.silentItemsByLotThenCategory[lotName][categoryName].push(item);
      } else {
        if (!acc.liveItemsByCategory[categoryName]) {
          acc.liveItemsByCategory[categoryName] = [];
        }
        acc.liveItemsByCategory[categoryName].push(item);
      }
      return acc;
    }, {
      liveItemsByCategory: {} as { [key: string]: Item[] },
      silentItemsByLotThenCategory: {} as { [key: string]: { [key: string]: Item[] } }
    });

  return (
    <div className="p-4 bg-white text-black text-xs">
      <header className="mb-4 text-center">
        <h1 className="text-4xl font-bold">{auction.name}</h1>
        <p className="text-lg text-gray-600">{auction.description}</p>
        <p className="text-md text-gray-500">
          {new Date(auction.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </header>

      <main>
        {Object.keys(liveItemsByCategory).length > 0 && (
          <section>
            <h2 className="section-header">Live Auction Items</h2>
            <table className="catalog-table">
              {Object.entries(liveItemsByCategory).map(([categoryName, items]) =>
                renderCategoryGroup(categoryName, items)
              )}
            </table>
          </section>
        )}

        {Object.keys(silentItemsByLotThenCategory).length > 0 && (
          <section className="page-break">
            <h2 className="section-header">Silent Auction Items</h2>
            {Object.entries(silentItemsByLotThenCategory).map(([lotName, categories]) => (
              <div key={lotName} className="lot-group">
                <h3>Lot: {lotName}</h3>
                <table className="catalog-table">
                  {Object.entries(categories).map(([categoryName, items]) =>
                    renderCategoryGroup(categoryName, items)
                  )}
                </table>
              </div>
            ))}
          </section>
        )}
      </main>

       <style jsx global>{`
            .page-break {
                page-break-before: always;
            }
            .section-header {
                font-size: 1.5rem; /* 24px */
                font-weight: 700;
                border-bottom: 2px solid black;
                padding-bottom: 0.25rem; /* 4px */
                margin-bottom: 1rem; /* 16px */
            }
            .lot-group h3 {
                font-size: 1.25rem; /* 20px */
                font-weight: 700;
                margin-bottom: 0.5rem; /* 8px */
            }
            .category-header h3 {
                font-size: 1.125rem; /* 18px */
                font-weight: 700;
                font-style: italic;
                padding: 0.125rem 0; /* 2px */
            }
            .category-header {
                padding: 0;
            }
            .catalog-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 0.25rem; /* 4px */
            }
            .item-row td {
                padding: 0.25rem 0.25rem;
                vertical-align: middle;
                border-bottom: 1px solid #e5e7eb; /* gray-200 */
            }
            .image-cell {
                width: 10%;
                padding-right: 0.5rem;
            }
            .thumbnail {
                width: 64px;
                height: 64px;
                object-fit: cover;
                border-radius: 4px;
            }
            .sku-cell {
                width: 10%;
                font-weight: 700;
                font-family: monospace;
            }
            .name-cell {
                width: 15%;
                font-weight: 600;
            }
            .description-cell {
                width: 30%;
                color: #4b5563; /* gray-600 */
            }
            .value-cell {
                width: 10%;
                white-space: nowrap;
            }
            .notes-cell {
                width: 25%;
                border-left: 1px solid #e5e7eb;
            }
        `}</style>
    </div>
  );
}

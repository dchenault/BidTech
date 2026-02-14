
import type { Auction, Patron, Item, Lot, Donor } from './types';
import { formatCurrency } from './utils';


// Utility function to trigger a file download
function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 1. Export All Patrons (Master List)
export function exportPatronsToCSV(patrons: Patron[]) {
  const csvHeader = [
    'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP',
  ].join(',');

  const csvRows = patrons.map((p) =>
    [
      p.id,
      `"${p.firstName}"`,
      `"${p.lastName}"`,
      p.email || '',
      p.phone || '',
      `"${p.address?.street || ''}"`,
      `"${p.address?.city || ''}"`,
      p.address?.state || '',
      p.address?.zip || '',
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  downloadFile(csvContent, 'all_patrons.csv', 'text/csv;charset=utf-s8;');
}

// 2. Export All Donors (Master List)
export function exportDonorsToCSV(donors: Donor[]) {
  const csvHeader = [
    'ID', 'Account ID', 'Name', 'Type', 'Contact Person', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP',
  ].join(',');

  const csvRows = donors.map((d) =>
    [
      d.id,
      d.accountId,
      `"${d.name}"`,
      d.type,
      `"${d.contactPerson || ''}"`,
      d.email || '',
      d.phone || '',
      `"${d.address?.street || ''}"`,
      `"${d.address?.city || ''}"`,
      d.address?.state || '',
      d.address?.zip || '',
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  downloadFile(csvContent, 'all_donors.csv', 'text/csv;charset=utf-8;');
}

// 3. Export Auction Patrons
export function exportAuctionPatronsToCSV(patrons: (Patron & {biddingNumber: number})[], auctionName: string) {
    const csvHeader = [
    'Bidder Number', 'First Name', 'Last Name', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP',
  ].join(',');

  const csvRows = patrons.map((p) =>
    [
      p.biddingNumber || 'N/A',
      `"${p.firstName}"`,
      `"${p.lastName}"`,
      p.email || '',
      p.phone || '',
      `"${p.address?.street || ''}"`,
      `"${p.address?.city || ''}"`,
      p.address?.state || '',
      p.address?.zip || '',
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const fileName = `patrons_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-s8;');
}


// 4. Export Auction Items
export function exportItemsToCSV(items: Item[], auctionName: string) {
  const csvHeader = [
    'SKU', 'Item ID', 'Auction ID', 'Name', 'Description', 'Category', 'Estimated Value', 'Donor Name'
  ].join(',');

  const csvRows = items.map(item => 
    [
      item.sku,
      item.id,
      item.auctionId,
      `"${item.name}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.category.name}"`,
      item.estimatedValue,
      `"${item.donor?.name || ''}"`
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const fileName = `items_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}


// 5. Export Winning Bids for an Auction
export function exportWinningBidsToCSV(items: Item[], auctionName: string) {
  const winningBids = items.filter(item => item.winningBid && item.winner);

  const csvHeader = [
    'Item ID', 'Auction ID', 'Item Name', 'Winning Bid', 'Bidder ID', 'Winner Name', 'Winner Email'
  ].join(',');
  
  let totalRevenue = 0;

  const csvRows = winningBids.map(item => {
    totalRevenue += item.winningBid || 0;
    return [
      item.id,
      item.auctionId,
      `"${item.name}"`,
      item.winningBid || 0,
      item.winner?.biddingNumber || 'N/A',
      `"${item.winner!.firstName} ${item.winner!.lastName}"`,
      item.winner?.email || ''
    ].join(',');
  });

  const footer = `\n\nTotal,,${totalRevenue}`;
  const csvContent = [csvHeader, ...csvRows, footer].join('\n');
  const fileName = `winning_bids_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

// 6. Export Full Auction Report (All Auctions)
export function exportFullReportToCSV(auctions: { id: string; name: string; items: Item[] }[]) {
  const csvHeader = [
    'Auction ID', 'Auction Name', 'Item ID', 'Item Name', 'Winning Bid', 'Bidder ID', 'Winner Name', 'Winner Email'
  ].join(',');

  let grandTotal = 0;
  const allRows: string[] = [];

  auctions.forEach(auction => {
    const winningBids = auction.items.filter(item => item.winningBid && item.winner);
    let auctionTotal = 0;
    
    winningBids.forEach(item => {
      const bidAmount = item.winningBid || 0;
      auctionTotal += bidAmount;
      allRows.push([
        auction.id,
        `"${auction.name}"`,
        item.id,
        `"${item.name}"`,
        bidAmount,
        item.winner?.biddingNumber || 'N/A',
        `"${item.winner!.firstName} ${item.winner!.lastName}"`,
        item.winner?.email || ''
      ].join(','));
    });

    if (winningBids.length > 0) {
      allRows.push(`Subtotal for ${auction.name},,,,${auctionTotal}`);
      allRows.push(''); // Add a blank line for spacing
    }
    grandTotal += auctionTotal;
  });
  
  const footer = `\n\nGrand Total,,,,${grandTotal}`;
  const csvContent = [csvHeader, ...allRows, footer].join('\n');
  downloadFile(csvContent, 'full_auction_report.csv', 'text/csv;charset=utf-8;');
}


// 7. Export Auction Catalog to HTML
export function exportAuctionCatalogToHTML(auction: Auction & { items: Item[], lots: Lot[] }) {
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


  const styles = `
    <style>
        @page { size: letter portrait; margin: 0.5in; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #333; font-size: 9pt; }
        header { text-align: center; margin-bottom: 20px; page-break-after: avoid; }
        h1 { font-size: 2em; margin: 0; }
        .section-header { font-size: 1.5rem; font-weight: 700; border-bottom: 2px solid black; padding-bottom: 0.25rem; margin-top: 1.5rem; margin-bottom: 1rem; }
        .lot-group > h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; margin-top: 1.5rem; }
        .category-header > h3 { font-size: 1.125rem; font-weight: 700; font-style: italic; padding: 0.125rem 0; }
        .catalog-table { width: 100%; border-collapse: collapse; margin-bottom: 0.25rem; page-break-inside: avoid; }
        .item-row td { padding: 0.25rem 0.25rem; vertical-align: middle; border-bottom: 1px solid #e5e7eb; }
        .category-header { padding: 0; }
        .category-header td { border: none; }
        .image-cell { width: 10%; padding-right: 8px; }
        .thumbnail { width: 64px; height: 64px; object-fit: cover; border-radius: 4px; }
        .sku-cell { width: 10%; font-weight: 700; font-family: monospace; }
        .name-cell { width: 15%; font-weight: 600; }
        .description-cell { width: 30%; color: #4b5563; }
        .value-cell { width: 10%; white-space: nowrap; }
        .notes-cell { width: 25%; border-left: 1px solid #e5e7eb; }
        .page-break { page-break-before: always; }
        @media print { body { font-size: 9pt; } }
    </style>
  `;
    const renderItemRow = (item: Item) => `
        <tr class="item-row">
            <td class="image-cell">
                ${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${item.name}" class="thumbnail" />` : ''}
            </td>
            <td class="sku-cell">${item.sku}</td>
            <td class="name-cell">${item.name}</td>
            <td class="description-cell">${item.description}</td>
            <td class="value-cell">Estimated Value: ${formatCurrency(item.estimatedValue)}</td>
            <td class="notes-cell"></td>
        </tr>
    `;

    const renderCategoryGroup = (categoryName: string, items: Item[]) => `
        <tbody>
            <tr class="category-header">
                <td colspan="6"><h3>Category: ${categoryName}</h3></td>
            </tr>
            ${items.map(renderItemRow).join('')}
        </tbody>
    `;


    let liveItemsHtml = '';
    if (Object.keys(liveItemsByCategory).length > 0) {
        liveItemsHtml += '<h2 class="section-header">Live Auction Items</h2>';
        liveItemsHtml += '<table class="catalog-table">';
        liveItemsHtml += Object.entries(liveItemsByCategory).map(([categoryName, items]) =>
            renderCategoryGroup(categoryName, items)
        ).join('');
        liveItemsHtml += '</table>';
    }

    let silentItemsHtml = '';
    if (Object.keys(silentItemsByLotThenCategory).length > 0) {
        silentItemsHtml += '<h2 class="section-header page-break">Silent Auction Items</h2>';
        silentItemsHtml += Object.entries(silentItemsByLotThenCategory).map(([lotName, categories]) => `
            <div class="lot-group">
                <h3>Lot: ${lotName}</h3>
                <table class="catalog-table">
                    ${Object.entries(categories).map(([categoryName, items]) =>
                        renderCategoryGroup(categoryName, items)
                    ).join('')}
                </table>
            </div>
        `).join('');
    }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Auction Catalog: ${auction.name}</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        <header>
          <h1>${auction.name}</h1>
          <p>${auction.description}</p>
          <p>${new Date(auction.startDate).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}</p>
        </header>
        <main>
          ${liveItemsHtml}
          ${silentItemsHtml}
        </main>
      </div>
    </body>
    </html>
  `;
  
  const fileName = `catalog_${auction.name.replace(/\s+/g, '_').toLowerCase()}.html`;
  downloadFile(fullHtml, fileName, 'text/html;charset=utf-8;');
}

// 8. Export Patron Receipt to HTML
export function exportPatronReceiptToHTML(data: { patron: Patron, items: Item[], auction: Auction }) {
  const { patron, items, auction } = data;
  const totalSpent = items.reduce((sum, item) => sum + (item.winningBid || 0), 0);

  const styles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
      .receipt-container { max-width: 800px; margin: 20px auto; padding: 20px; }
      header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
      h1 { font-size: 2.2em; margin: 0; }
      .patron-details { margin-bottom: 30px; }
      .patron-details h2 { font-size: 1.5em; margin-bottom: 10px; }
      .patron-details p { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
      th { background-color: #f9f9f9; }
      td.amount { text-align: right; font-family: monospace; }
      .total-row td { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; }
      .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #888; }
       @media print {
        body { font-size: 10pt; }
        .receipt-container { margin: 0; padding: 0; border: none; max-width: 100%; }
        header { margin-bottom: 20px; padding-bottom: 10px; }
      }
    </style>
  `;

  let itemsHtml = '';
  items.forEach(item => {
    const isDonation = item.sku.toString().startsWith('DON-');
    const itemName = isDonation ? `Donation to ${auction.name}` : item.name;
    itemsHtml += `
      <tr>
        <td>${item.sku}</td>
        <td>${itemName}</td>
        <td class="amount">${formatCurrency(item.winningBid || 0)}</td>
      </tr>
    `;
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Patron Receipt - ${patron.firstName} ${patron.lastName}</title>
      ${styles}
    </head>
    <body>
      <div class="receipt-container">
        <header>
          <h1>Thank You!</h1>
          <p>Receipt for your contributions to ${auction.name}</p>
        </header>
        <section class="patron-details">
          <h2>Receipt For:</h2>
          <p><b>${patron.firstName} ${patron.lastName}</b> (Bidder #: ${patron.biddingNumber || 'N/A'})</p>
          <p>${patron.address?.street || ''}</p>
          <p>${patron.address?.city || ''}, ${patron.address?.state || ''} ${patron.address?.zip || ''}</p>
          <p>${patron.email || ''}</p>
        </section>
        <main>
          <h2>Contributions</h2>
          <table>
            <thead>
              <tr>
                <th>Item #</th>
                <th>Item/Donation Name</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="2" style="text-align: right;"><b>Total:</b></td>
                <td class="amount"><b>${formatCurrency(totalSpent)}</b></td>
              </tr>
            </tbody>
          </table>
        </main>
        <footer class="footer">
          <p>We sincerely thank you for your generous support of ${auction.name}.</p>
        </footer>
      </div>
    </body>
    </html>
  `;
    
  const fileName = `receipt_${patron.lastName}_${auction.name.replace(/\s+/g, '_').toLowerCase()}.html`;
  downloadFile(fullHtml, fileName, 'text/html;charset=utf-8;');
}

// 9. Export Donations for an Auction
export function exportDonationsToCSV(items: Item[], auctionName: string) {
  const donations = items.filter(item => item.sku.toString().startsWith('DON-'));

  const csvHeader = [
    'Donation SKU', 'Amount', 'Winner Name', 'Winner Email'
  ].join(',');
  
  let totalDonations = 0;

  const csvRows = donations.map(item => {
    totalDonations += item.winningBid || 0;
    return [
      item.sku,
      item.winningBid || 0,
      item.winner ? `"${item.winner.firstName} ${item.winner.lastName}"` : 'N/A',
      item.winner?.email || 'N/A'
    ].join(',');
  });

  const footer = `\nTotal,${totalDonations}`;
  const csvContent = [csvHeader, ...csvRows, footer].join('\n');
  const fileName = `donations_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

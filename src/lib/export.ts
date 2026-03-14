import type { Auction, Patron, Item, Lot, Donor } from './types';
import { formatCurrency } from './utils';


// Utility function to trigger a file download for CSVs
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

// Utility function to open HTML content in a new tab for printing
function openHtmlInNewTab(htmlContent: string) {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  } else {
    alert('Could not open a new tab. Please check your browser\'s popup blocker settings.');
  }
}

// Shared Natural Sort Logic
const naturalSort = (a: string | number, b: string | number) => 
  a.toString().localeCompare(b.toString(), undefined, { numeric: true, sensitivity: 'base' });

// Helper for natural sort: Numerics first, then Alpha/Lots (Used for CSV)
function getSortedItemsForCatalog(items: Item[]) {
  const nonDonations = items.filter(item => !item.sku.toString().startsWith('DON-'));
  
  // Pass 1: Strictly Numeric SKUs
  const numericItems = nonDonations.filter(item => /^\d+$/.test(item.sku.toString()));
  // Pass 2: Lots or Alpha-Numeric SKUs
  const alphaItems = nonDonations.filter(item => !/^\d+$/.test(item.sku.toString()));

  return [
    ...numericItems.sort((a, b) => naturalSort(a.sku, b.sku)), 
    ...alphaItems.sort((a, b) => naturalSort(a.sku, b.sku))
  ];
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
      `"${p.phone || ''}"`,
      `"${p.address?.street || ''}"`,
      `"${p.address?.city || ''}"`,
      p.address?.state || '',
      `"${p.address?.zip || ''}"`,
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  downloadFile(csvContent, 'all_patrons.csv', 'text/csv;charset=utf-8;');
}

// 2. Export All Donors
export function exportDonorsToCSV(donors: Donor[], fileName = 'all_donors.csv') {
  const csvHeader = [
    'ID', 'Account ID', 'Business Name', 'Donor First Name', 'Donor Last Name', 'Type', 'Contact Person', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP',
  ].join(',');

  const csvRows = donors.map((d) =>
    [
      d.id,
      d.accountId,
      `"${d.businessName || d.name || ''}"`,
      `"${d.firstName || ''}"`,
      `"${d.lastName || ''}"`,
      d.type,
      `"${d.contactPerson || ''}"`,
      d.email || '',
      `"${d.phone || ''}"`,
      `"${d.address?.street || ''}"`,
      `"${d.address?.city || ''}"`,
      d.address?.state || '',
      `"${d.address?.zip || ''}"`,
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

// 3. Export Auction Patrons
export function exportAuctionPatronsToCSV(patrons: (Patron & {biddingNumber: number, amountDueInAuction?: number})[], auctionName: string) {
    const csvHeader = [
    'Bidder Number', 'First Name', 'Last Name', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP', 'Auction Total Spent'
  ].join(',');

  const csvRows = patrons.map((p) =>
    [
      p.biddingNumber || 'N/A',
      `"${p.firstName}"`,
      `"${p.lastName}"`,
      p.email || '',
      `"${p.phone || ''}"`,
      `"${p.address?.street || ''}"`,
      `"${p.address?.city || ''}"`,
      p.address?.state || '',
      `"${p.address?.zip || ''}"`,
      p.amountDueInAuction || 0
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const fileName = `patrons_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}


// 4. Export Auction Items (Detailed Metadata CSV with Full Winner Info)
export function exportItemsToCSV(
  items: Item[], 
  auctionName: string, 
  registeredPatrons: (Patron & { biddingNumber: number })[] = []
) {
  const sorted = getSortedItemsForCatalog(items);
  
  // Create a map for quick full profile lookups: patronId -> Full Patron Object
  const patronMap = new Map(registeredPatrons.map(rp => [rp.id, rp]));

  const csvHeader = [
    'SKU', 
    'Item Name', 
    'Category',
    'Description',
    'Estimated Value',
    'Item Custodian',
    'Donor Business',
    'Donor First Name',
    'Donor Last Name',
    'Donor Contact First Name',
    'Donor Contact Last Name',
    'Donor Email',
    'Donor Phone',
    'Donor Street',
    'Donor City',
    'Donor State',
    'Donor Zip',
    'Winner First Name',
    'Winner Last Name',
    'Winner Bidder #',
    'Sold Price',
    'Winner Address',
    'Winner City',
    'Winner State',
    'Winner Zip',
    'Winner Phone',
    'Winner Email'
  ].join(',');

  const csvRows = sorted.map(item => {
    const d = item.donor;
    const isBusiness = d?.type === 'Business' || d?.isBusiness;
    const donorAddr = d?.address;
    
    // Logic for Donor Business name mapping with fallback
    const donorBusinessName = d?.businessName || d?.name || '';
    
    // Logic for Name splitting: if business, names go to "Contact" columns.
    let donorFirstName = '';
    let donorLastName = '';
    let contactFirstName = '';
    let contactLastName = '';

    if (!isBusiness) {
        donorFirstName = d?.firstName || '';
        donorLastName = d?.lastName || '';
    } else {
        contactFirstName = d?.firstName || '';
        contactLastName = d?.lastName || '';
    }

    const winner = item.winnerId ? patronMap.get(item.winnerId) : null;
    const winnerFirstName = winner?.firstName || '';
    const winnerLastName = winner?.lastName || '';
    const bidderNumber = winner ? (winner.biddingNumber || 'N/A') : 'N/A';
    const soldPrice = item.winningBid || 0;

    const winAddr = winner?.address;

    return [
      `"${item.sku}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category?.name || 'Misc'}"`,
      `"${item.description?.replace(/"/g, '""') || ''}"`,
      item.estimatedValue || 0,
      `"${item.assignedRunner || ''}"`,
      `"${donorBusinessName}"`,
      `"${donorFirstName}"`,
      `"${donorLastName}"`,
      `"${contactFirstName}"`,
      `"${contactLastName}"`,
      `"${d?.email || ''}"`,
      `"${d?.phone || ''}"`,
      `"${donorAddr?.street || ''}"`,
      `"${donorAddr?.city || ''}"`,
      `"${donorAddr?.state || ''}"`,
      `"${donorAddr?.zip || ''}"`,
      `"${winnerFirstName}"`,
      `"${winnerLastName}"`,
      `"${bidderNumber}"`,
      soldPrice,
      `"${winAddr?.street || ''}"`,
      `"${winAddr?.city || ''}"`,
      `"${winAddr?.state || ''}"`,
      `"${winAddr?.zip || ''}"`,
      `"${winner?.phone || ''}"`,
      `"${winner?.email || ''}"`
    ].join(',');
  });

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const fileName = `items_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

// 5. Export All Items
export function exportAllItemsToCSV(items: (Item & { auctionName?: string })[]) {
  const csvHeader = [
    'Auction Name', 'SKU', 'Name', 'Description', 'Category', 'Estimated Value', 'Item Custodian', 'Donor Business', 'Donor First Name', 'Donor Last Name'
  ].join(',');

  const csvRows = items.map(item => 
    [
      `"${item.auctionName || 'N/A'}"`,
      item.sku,
      `"${item.name}"`,
      `"${item.description?.replace(/"/g, '""') || ''}"`,
      `"${item.category.name}"`,
      item.estimatedValue,
      `"${item.assignedRunner || ''}"`,
      `"${item.donor?.businessName || item.donor?.name || ''}"`,
      `"${item.donor?.firstName || ''}"`,
      `"${item.donor?.lastName || ''}"`
    ].join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  downloadFile(csvContent, 'all_items.csv', 'text/csv;charset=utf-8;');
}

// 6. Export Winning Bids for an Auction
export function exportWinningBidsToCSV(items: Item[], auctionName: string) {
  const winningBids = items.filter(item => 
    item.winningBid && 
    item.winner &&
    !item.sku.toString().startsWith('DON-')
  );

  const csvHeader = [
    'Item SKU', 'Item Name', 'Winning Bid', 'Winner First Name', 'Winner Last Name', 'Winner Email', 'Winner Phone', 'Winner Street', 'Winner City', 'Winner State', 'Winner ZIP'
  ].join(',');
  
  let totalRevenue = 0;

  const csvRows = winningBids.map(item => {
    totalRevenue += item.winningBid || 0;
    return [
      item.sku,
      `"${item.name}"`,
      item.winningBid || 0,
      `"${item.winner!.firstName}"`,
      `"${item.winner!.lastName}"`,
      item.winner?.email || '',
      `"${item.winner?.phone || ''}"`,
      `"${item.winner?.address?.street || ''}"`,
      `"${item.winner?.address?.city || ''}"`,
      `"${item.winner?.address?.state || ''}"`,
      `"${item.winner?.address?.zip || ''}"`,
    ].join(',');
  });

  const footer = `\n\n,Total,${totalRevenue}`;
  const csvContent = [csvHeader, ...csvRows, footer].join('\n');
  const fileName = `winning_bids_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

// 7. Export All Winning Bids (Full Report)
export function exportAllWinningBidsToCSV(items: (Item & { auctionName?: string })[]) {
    const winningBids = items.filter(item => 
      item.winningBid && 
      item.winner &&
      !item.sku.toString().startsWith('DON-')
    );

    const csvHeader = [
    'Auction Name', 'Item Name', 'Winning Bid', 'Winner First Name', 'Winner Last Name', 'Winner Email'
    ].join(',');

    let grandTotal = 0;

    const csvRows = winningBids.map(item => {
        grandTotal += item.winningBid || 0;
        return [
        `"${item.auctionName || 'N/A'}"`,
        `"${item.name}"`,
        item.winningBid || 0,
        `"${item.winner!.firstName}"`,
        `"${item.winner!.lastName}"`,
        item.winner?.email || ''
        ].join(',');
    });

    const footer = `\n\nTotal,${grandTotal}`;
    const csvContent = [csvHeader, ...csvRows, footer].join('\n');
    downloadFile(csvContent, 'all_winning_bids.csv', 'text/csv;charset=utf-8;');
}


// 8. Export Auction Catalog to HTML (Live vs Silent Grouping)
export function exportAuctionCatalogToHTML(auction: Auction & { items: Item[], lots: Lot[] }) {
    const { items, lots } = auction;
    const nonDonations = items.filter(i => !i.sku.toString().startsWith('DON-'));
    
    // 1. Resolve Lot Names
    const lotMap = new Map(lots.map(l => [l.id, l.name]));
    
    // 2. Separate Live vs Silent
    // Live items are those WITHOUT a lotId
    const liveItems = nonDonations.filter(i => !i.lotId).sort((a, b) => naturalSort(a.sku, b.sku));
    
    // Silent items are grouped by Lot
    const silentItems = nonDonations.filter(i => !!i.lotId);
    const groupedSilent = silentItems.reduce((acc, item) => {
        const lotName = lotMap.get(item.lotId!) || 'General Silent Auction';
        if (!acc[lotName]) acc[lotName] = [];
        acc[lotName].push(item);
        return acc;
    }, {} as Record<string, Item[]>);

    // Sort items within each lot
    Object.keys(groupedSilent).forEach(lotName => {
        groupedSilent[lotName].sort((a, b) => naturalSort(a.sku, b.sku));
    });

    const sortedLotNames = Object.keys(groupedSilent).sort(naturalSort);

    const safeFormatDate = (dateInput: any, options: Intl.DateTimeFormatOptions) => {
        if (!dateInput) return '';
        const date = (typeof dateInput.toDate === 'function') ? dateInput.toDate() : new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', options);
    };

    const styles = `
    <style>
        @page { size: letter portrait; margin: 0.5in; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #333; font-size: 10pt; }
        header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        h1 { font-size: 2.5em; margin: 0; text-transform: uppercase; }
        h2 { font-size: 2em; margin: 40px 0 20px 0; padding-bottom: 10px; border-bottom: 4px solid #000; text-transform: uppercase; }
        .lot-header { font-size: 1.5em; font-weight: bold; background: #f0f0f0; padding: 10px; margin: 30px 0 10px 0; border-left: 10px solid #000; }
        .catalog-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .catalog-table th { text-align: left; padding: 12px 8px; border-bottom: 3px solid #000; font-size: 1.1em; text-transform: uppercase; }
        .catalog-table td { padding: 12px 8px; border-bottom: 1px solid #ccc; vertical-align: top; }
        .sku-cell { font-weight: bold; width: 10%; font-size: 1.4em; }
        .name-cell { width: 25%; font-weight: bold; font-size: 1.2em; }
        .donor-info { font-style: italic; color: #555; font-size: 0.9em; margin-top: 4px; }
        .description-cell { width: 40%; line-height: 1.5; }
        .notes-cell { width: 25%; border-left: 2px solid #eee; background: #fafafa; }
        .page-break { page-break-before: always; }
        tr { page-break-inside: avoid; }
    </style>
    `;

    const renderTable = (itemsToRender: Item[]) => `
        <table class="catalog-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Item / Donor</th>
                    <th>Description</th>
                    <th>Winning Bid Info</th>
                </tr>
            </thead>
            <tbody>
                ${itemsToRender.map(item => `
                    <tr>
                        <td class="sku-cell">${item.sku}</td>
                        <td class="name-cell">
                            ${item.name}
                            ${item.donor?.businessName || item.donor?.name ? `<div class="donor-info">Donated by: ${item.donor?.businessName || item.donor?.name}</div>` : ''}
                        </td>
                        <td class="description-cell">${item.description}</td>
                        <td class="notes-cell"></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Catalog: ${auction.name}</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        <header>
          <h1>${auction.name}</h1>
          <p style="font-size: 1.2em; margin: 10px 0;">${auction.description || ''}</p>
          <p style="font-weight: bold;">${safeFormatDate(auction.startDate, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}</p>
        </header>

        <main>
            ${liveItems.length > 0 ? `
                <h2>Live Auction Items</h2>
                ${renderTable(liveItems)}
            ` : ''}

            ${sortedLotNames.length > 0 ? `
                <div class="page-break">
                    <h2>Silent Auction Items</h2>
                    ${sortedLotNames.map(lotName => `
                        <div class="lot-header">Lot: ${lotName}</div>
                        ${renderTable(groupedSilent[lotName])}
                    `).join('')}
                </div>
            ` : ''}
        </main>
      </div>
    </body>
    </html>
    `;
  
    openHtmlInNewTab(htmlContent);
}

// 9. Export Patron Receipt to HTML
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
        <td>${item.paymentMethod || 'N/A'}</td>
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
                <th>Method</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;"><b>Total:</b></td>
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
    
  openHtmlInNewTab(fullHtml);
}

// 10. Export Donations for an Auction
export function exportDonationsToCSV(items: Item[], auctionName: string) {
  const donations = items.filter(item => item.sku.toString().startsWith('DON-'));

  const csvHeader = [
    'Donation SKU', 'Amount', 'Patron First Name', 'Patron Last Name', 'Patron Email'
  ].join(',');
  
  let totalDonations = 0;

  const csvRows = donations.map(item => {
    totalDonations += item.winningBid || 0;
    return [
      item.sku,
      item.winningBid || 0,
      item.winner ? `"${item.winner.firstName}"` : 'N/A',
      item.winner ? `"${item.winner.lastName}"` : '',
      item.winner?.email || 'N/A'
    ].join(',');
  });

  const footer = `\nTotal,${totalDonations}`;
  const csvContent = [csvHeader, ...csvRows, footer].join('\n');
  const fileName = `donations_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}

// 11. Export All Donations
export function exportAllDonationsToCSV(items: (Item & { auctionName?: string })[]) {
  const donations = items.filter(item => item.sku.toString().startsWith('DON-'));
  const csvHeader = [
    'Auction Name', 'Donation SKU', 'Amount', 'Patron First Name', 'Patron Last Name', 'Patron Email'
  ].join(',');
  
  let totalDonations = 0;

  const csvRows = donations.map(item => {
    totalDonations += item.winningBid || 0;
    return [
      `"${item.auctionName || 'N/A'}"`,
      item.sku,
      `"${item.winningBid || 0}"`,
      item.winner ? `"${item.winner.firstName}"` : 'N/A',
      item.winner ? `"${item.winner.lastName}"` : '',
      item.winner?.email || 'N/A'
    ].join(',');
  });

  const footer = `\nTotal,${totalDonations}`;
  const csvContent = [csvHeader, ...csvRows, footer].join('\n');
  downloadFile(csvContent, 'all_donations.csv', 'text/csv;charset=utf-8;');
}

// 12. Export Auctioneer Sheet to HTML
export function exportAuctioneerSheetToHTML(item: Item, auction: Auction) {
  const styles = `
    <style>
      @page { size: letter portrait; margin: 0.5in; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #000; background: #fff; }
      .container { max-width: 800px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
      .sku { font-size: 84pt; font-weight: 900; line-height: 1; margin: 0; }
      .auction-info { text-align: right; }
      .auction-name { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0; }
      .sheet-label { font-size: 14pt; color: #666; margin: 0; }
      .item-name { font-size: 36pt; font-weight: 800; text-align: center; margin: 20px 0; line-height: 1.1; }
      .image-container { text-align: center; margin-bottom: 30px; }
      .item-image { max-width: 100%; max-height: 400px; border: 2px solid #eee; border-radius: 8px; object-fit: contain; }
      .details { font-size: 18pt; line-height: 1.6; margin-bottom: 40px; }
      .footer { border-top: 2px solid #000; padding-top: 20px; display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
      .footer-box { background: #f9f9f9; padding: 15px; border-radius: 8px; }
      .footer-label { font-size: 12pt; font-weight: bold; text-transform: uppercase; color: #555; display: block; margin-bottom: 5px; }
      .footer-value { font-size: 20pt; font-weight: bold; }
      .print-controls { position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px; }
      .btn { padding: 10px 20px; font-size: 14pt; cursor: pointer; border-radius: 5px; border: none; }
      .btn-print { background: #000; color: #fff; }
      .btn-close { background: #eee; color: #000; }
      @media print {
        .print-controls { display: none; }
        body { -webkit-print-color-adjust: exact; }
      }
    </style>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Auctioneer Sheet: ${item.sku}</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="sku">${item.sku}</h1>
          <div class="auction-info">
            <p class="auction-name">${auction.name}</p>
            <p class="sheet-label">Auctioneer Flashcard</p>
          </div>
        </div>

        <h2 class="item-name">${item.name}</h2>

        ${item.imageUrl ? `
          <div class="image-container">
            <img src="${item.imageUrl}" class="item-image" alt="${item.name}" />
          </div>
        ` : ''}

        <div class="details">
          ${item.description || 'No description provided.'}
        </div>

        <div class="footer">
          <div class="footer-box">
            <span class="footer-label">Donated By</span>
            <span class="footer-value">${item.donor?.businessName || item.donor?.name || 'Anonymous'}</span>
          </div>
          <div class="footer-box">
            <span class="footer-label">Starting Value</span>
            <span class="footer-value">${formatCurrency(item.estimatedValue)}</span>
          </div>
        </div>
      </div>

      <div class="print-controls">
        <button class="btn btn-close" onclick="window.close()">Close</button>
        <button class="btn btn-print" onclick="window.print()">Print Sheet</button>
      </div>
    </body>
    </html>
  `;

  openHtmlInNewTab(htmlContent);
}

// 13. Export Full Auction Outcome (Comprehensive Report)
export function exportFullAuctionOutcome(data: {
  items: Item[],
  lots: Lot[],
  auctionName: string,
}) {
  const { items, lots, auctionName } = data;

  const physicalItems = items.filter(i => !i.sku.toString().startsWith('DON-'));
  const donations = items.filter(i => i.sku.toString().startsWith('DON-'));

  const sortedPhysical = physicalItems.sort((a, b) => 
    a.sku.toString().localeCompare(b.sku.toString(), undefined, { numeric: true, sensitivity: 'base' })
  );

  const csvRows: string[] = [];

  // Section A: Itemized Results
  csvRows.push('SECTION A: ITEMIZED RESULTS');
  csvRows.push(['SKU', 'Item Name', 'Category', 'Item Custodian', 'Business/Donor', 'Winner First Name', 'Winner Last Name', 'Winning Bid', 'Status', 'Payment Method'].join(','));
  sortedPhysical.forEach(i => {
    csvRows.push([
      i.sku,
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.category?.name || 'Misc'}"`,
      `"${i.assignedRunner || ''}"`,
      `"${(i.donor?.businessName || i.donor?.name || '').replace(/"/g, '""')}"`,
      i.winner ? `"${i.winner.firstName}"` : 'Unsold',
      i.winner ? `"${i.winner.lastName}"` : '',
      i.winningBid || 0,
      i.winnerId ? 'Sold' : 'Unsold',
      i.paymentMethod || 'N/A'
    ].join(','));
  });

  csvRows.push('');
  csvRows.push('');
  
  // Section B: Lot Summaries
  csvRows.push('SECTION B: LOT SUMMARIES');
  csvRows.push(['Lot Name', 'Total Revenue', 'Items Count'].join(','));
  const lotMap = new Map(lots.map(l => [l.id, l.name]));
  const revByLot = new Map<string, { total: number, count: number }>();
  lots.forEach(l => revByLot.set(l.id, { total: 0, count: 0 }));
  
  let liveTotal = 0;
  let liveCount = 0;
  physicalItems.forEach(i => {
    if (i.lotId && revByLot.has(i.lotId)) {
      const current = revByLot.get(i.lotId)!;
      revByLot.set(i.lotId, { total: current.total + (i.winningBid || 0), count: current.count + 1 });
    } else {
      liveTotal += (i.winningBid || 0);
      liveCount += 1;
    }
  });

  Array.from(revByLot.entries()).forEach(([id, d]) => {
    csvRows.push([`"${lotMap.get(id) || 'Unknown Lot'}"`, d.total, d.count].join(','));
  });
  csvRows.push(['"LIVE AUCTION TOTAL"', liveTotal, liveCount].join(','));

  csvRows.push('');
  csvRows.push('');

  // Section C: Charitable Donations
  csvRows.push('SECTION C: CHARITABLE DONATIONS');
  csvRows.push(['Patron First Name', 'Patron Last Name', 'Amount', 'Payment Method'].join(','));
  donations.forEach(d => {
    csvRows.push([
      d.winner ? `"${d.winner.firstName}"` : 'Anonymous',
      d.winner ? `"${d.winner.lastName}"` : '',
      d.winningBid || 0,
      d.paymentMethod || 'N/A'
    ].join(','));
  });

  csvRows.push('');
  csvRows.push('');

  // KPI Summary Block
  const totalItems = physicalItems.length;
  const soldItems = physicalItems.filter(i => i.winnerId).length;
  const auctionRev = physicalItems.reduce((s, i) => s + (i.winningBid || 0), 0);
  const donationRev = donations.reduce((s, i) => s + (i.winningBid || 0), 0);
  const cashTotal = items.filter(i => i.paymentMethod === 'Cash').reduce((s, i) => s + (i.winningBid || 0), 0);
  const checkTotal = items.filter(i => i.paymentMethod === 'Check').reduce((s, i) => s + (i.winningBid || 0), 0);
  const cardTotal = items.filter(i => i.paymentMethod === 'Card').reduce((s, i) => s + (i.winningBid || 0), 0);

  const topItem = [...physicalItems].sort((a, b) => (b.winningBid || 0) - (a.winningBid || 0))[0];
  const spenders = new Map<string, { name: string, total: number }>();
  items.forEach(i => {
    if (i.winnerId && i.winner) {
      const current = spenders.get(i.winnerId) || { name: `${i.winner.firstName} ${i.winner.lastName}`, total: 0 };
      spenders.set(i.winnerId, { name: current.name, total: current.total + (i.winningBid || 0) });
    }
  });
  const biggestSpender = Array.from(spenders.values()).sort((a, b) => b.total - a.total)[0];
  const topLotEntry = Array.from(revByLot.entries())
    .map(([id, d]) => ({ name: lotMap.get(id), total: d.total }))
    .sort((a, b) => b.total - a.total)[0];

  csvRows.push('KPI SUMMARY REPORT');
  csvRows.push(['Total Items in Catalog', totalItems].join(','));
  csvRows.push(['Total Items Sold', soldItems].join(','));
  csvRows.push(['Sell-through Rate', `${((soldItems / (totalItems || 1)) * 100).toFixed(1)}%`].join(','));
  csvRows.push('');
  csvRows.push('FINANCIAL BREAKDOWN');
  csvRows.push(['Auction Item Revenue', auctionRev].join(','));
  csvRows.push(['Donation Revenue', donationRev].join(','));
  csvRows.push(['GRAND TOTAL REVENUE', auctionRev + donationRev].join(','));
  csvRows.push('');
  csvRows.push('PAYMENT METHOD TOTALS');
  csvRows.push(['Cash', cashTotal].join(','));
  csvRows.push(['Check', checkTotal].join(','));
  csvRows.push(['Credit Card', cardTotal].join(','));
  csvRows.push('');
  csvRows.push('HALL OF FAME');
  csvRows.push(['Highest Item Sold', topItem ? `"${topItem.sku}: ${topItem.name.replace(/"/g, '""')}" ($${topItem.winningBid})` : 'N/A'].join(','));
  csvRows.push(['Biggest Spender', biggestSpender ? `"${biggestSpender.name}" ($${biggestSpender.total})` : 'N/A'].join(','));
  csvRows.push(['Top Performing Lot', topLotEntry ? `"${topLotEntry.name}" ($${topLotEntry.total})` : 'N/A'].join(','));

  const csvContent = csvRows.join('\n');
  const fileName = `outcome_${auctionName.replace(/\s+/g, '_').toLowerCase()}.csv`;
  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
}
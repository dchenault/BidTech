
import type { Auction, Item, Patron, Category, User } from './types';

export const mockUser: User = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@auctioneerpro.com',
  avatarUrl: 'https://picsum.photos/seed/100/100/100',
  accounts: { 'account-1': 'admin' },
  activeAccountId: 'account-1',
  role: 'admin',
};

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Fine Art' },
  { id: 'cat-2', name: 'Jewelry & Watches' },
  { id: 'cat-3', name: 'Collectibles' },
  { id: 'cat-4', name: 'Experiences' },
  { id: 'cat-5', name: 'Fashion' },
];

const mockPatrons: Patron[] = [
  {
    id: 'patron-1',
    accountId: 'account-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    address: { street: '123 Main St', city: 'Anytown', state: 'CA', zip: '12345' },
    totalSpent: 1250,
    itemsWon: 1,
    biddingNumber: 101,
  },
  {
    id: 'patron-2',
    accountId: 'account-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '555-987-6543',
    address: { street: '456 Oak Ave', city: 'Someville', state: 'NY', zip: '54321' },
    totalSpent: 3200,
    itemsWon: 2,
    biddingNumber: 102,
  },
];

const mockItems: Item[] = [
  {
    id: 'item-1',
    sku: 1001,
    name: 'Abstract Dreams',
    description: 'A vibrant abstract painting by a renowned local artist.',
    estimatedValue: 1500,
    category: defaultCategories[0],
    winningBid: 1750,
    winner: mockPatrons[1],
    auctionId: 'auction-1',
    accountId: 'account-1',
    categoryId: defaultCategories[0].id
  },
  {
    id: 'item-2',
    sku: 1002,
    name: 'The Chronograph',
    description: 'A vintage Swiss-made chronograph watch from the 1960s.',
    estimatedValue: 2500,
    category: defaultCategories[1],
    winningBid: 3200,
    auctionId: 'auction-1',
    accountId: 'account-1',
    categoryId: defaultCategories[1].id
  },
  {
    id: 'item-3',
    sku: 1003,
    name: 'Signed First Edition',
    description: 'A rare, signed first edition of a classic novel.',
    estimatedValue: 800,
    category: defaultCategories[2],
    winningBid: 1250,
    winner: mockPatrons[0],
    auctionId: 'auction-1',
    accountId: 'account-1',
    categoryId: defaultCategories[2].id
  },
  {
    id: 'item-4',
    sku: 1004,
    name: 'Weekend Getaway',
    description: 'A two-night stay at a luxury mountain resort.',
    estimatedValue: 1200,
    category: defaultCategories[3],
    auctionId: 'auction-1',
    accountId: 'account-1',
    categoryId: defaultCategories[3].id
  },
];

export const mockAuctions: Auction[] = [
  {
    id: 'auction-1',
    accountId: 'account-1',
    name: 'Annual Charity Gala 2024',
    description: 'Our biggest fundraising event of the year, featuring exclusive items and experiences.',
    type: 'Hybrid',
    status: 'active',
    itemCount: 32,
    startDate: '2024-10-26T18:00:00Z',
    items: mockItems,
    categories: [...defaultCategories, { id: 'cat-6', name: 'Sports Memorabilia' }],
    lots: [],
  },
  {
    id: 'auction-2',
    accountId: 'account-1',
    name: 'Spring Art Fair',
    description: 'A silent auction showcasing talented local artists.',
    type: 'Silent',
    status: 'completed',
    itemCount: 54,
    startDate: '2024-05-15T12:00:00Z',
    items: [],
    categories: [
        { id: 'cat-1', name: 'Fine Art' },
        { id: 'cat-paint', name: 'Paintings' },
        { id: 'cat-sculpt', name: 'Sculptures' }
    ],
    lots: [],
  },
  {
    id: 'auction-3',
    accountId: 'account-1',
    name: 'Holiday Fundraiser',
    description: 'Get your holiday gifts while supporting a good cause.',
    type: 'Live',
    status: 'upcoming',
    itemCount: 0,
    startDate: '2024-11-30T19:00:00Z',
    items: [],
    categories: [...defaultCategories],
    lots: [],
  },
];

export const mockMasterPatronList: Patron[] = [
  ...mockPatrons,
  {
    id: 'patron-3',
    accountId: 'account-1',
    firstName: 'Sam',
    lastName: 'Jones',
    email: 'sam.jones@example.com',
    phone: '555-555-5555',
    address: { street: '789 Pine Ln', city: 'Metropolis', state: 'IL', zip: '67890' },
    totalSpent: 850,
    itemsWon: 1,
    biddingNumber: 103,
  },
    {
    id: 'patron-4',
    accountId: 'account-1',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.j@example.com',
    phone: '555-111-2222',
    address: { street: '101 Maple Dr', city: 'Smalltown', state: 'TX', zip: '13579' },
    totalSpent: 4500,
    itemsWon: 3,
    biddingNumber: 104,
  },
];

import { z } from 'zod';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'manager';
};

export type Category = {
  id: string;
  name:string;
};

export const mockItemCategories: Category[] = [
  { id: 'cat-1', name: 'Fine Art' },
  { id: 'cat-2', name: 'Jewelry & Watches' },
  { id: 'cat-3', name: 'Collectibles' },
  { id: 'cat-4', name: 'Experiences' },
  { id: 'cat-5', name: 'Fashion' },
];

export type PaymentMethod = 'Card' | 'Cash' | 'Check' | 'Other';

export type Item = {
  id: string;
  sku: number | string;
  name: string;
  description: string;
  imageUrl?: string;
  estimatedValue: number;
  category: Category;
  winningBid?: number;
  winner?: Patron;
  winningBidderId?: string; 
  auctionId: string;
  accountId: string;
  categoryId: string;
  lotId?: string;
  paid?: boolean;
  paymentMethod?: PaymentMethod;
  imageDataUri?: string;
};

export type Lot = {
  id: string;
  name: string;
  auctionId: string;
};

export type Auction = {
  id: string;
  name: string;
  description?: string;
  type: 'Live' | 'Silent' | 'Hybrid';
  status: 'upcoming' | 'active' | 'completed';
  itemCount: number;
  startDate: string;
  items: Item[]; // This will be handled by a subcollection
  categories: Category[];
  lots: Lot[];
  accountId: string;
  managers?: Record<string, string>; // Map of UID to role
};

export type Account = {
    id: string;
    adminUserId: string;
    name: string;
    lastItemSku?: number;
};

export type Patron = {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  totalSpent: number;
  itemsWon: number;
  biddingNumber?: number; 
  notes?: string;
  avatarUrl?: string;
};

export type RegisteredPatron = {
    id: string;
    auctionId: string;
    patronId: string;
    bidderNumber: number;
    accountId: string;
};

export type Invitation = {
  id: string;
  accountId: string;
  auctionId: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted';
  acceptedBy?: string; // UID of the user who accepted
}


export const auctionFormSchema = z.object({
  name: z.string().min(2, {
    message: "Auction name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  type: z.enum(["Live", "Silent", "Hybrid"]),
  startDate: z.date({
    required_error: "A start date is required.",
  }),
});

export type FormValues = z.infer<typeof auctionFormSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long.'),
});
export type SignupValues = z.infer<typeof signupSchema>;


export const patronFormSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }),
});

export type PatronFormValues = z.infer<typeof patronFormSchema>;

export const itemFormSchema = z.object({
  name: z.string().min(2, "Item name is required."),
  description: z.string().optional(),
  estimatedValue: z.number().min(0, "Estimated value must be positive."),
  categoryId: z.string({ required_error: "Category is required."}),
  imageDataUri: z.string().optional(),
  lotId: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const lotFormSchema = z.object({
  name: z.string().min(2, "Lot name must be at least 2 characters."),
});

export type LotFormValues = z.infer<typeof lotFormSchema>;

export const inviteManagerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  auctionId: z.string({ required_error: 'Please select an auction.' }),
});

export type InviteManagerFormValues = z.infer<typeof inviteManagerSchema>;

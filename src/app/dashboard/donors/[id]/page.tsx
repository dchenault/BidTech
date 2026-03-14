'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDonors } from '@/hooks/use-donors';
import { useAuctions } from '@/hooks/use-auctions';
import type { Item, Donor, DonorFormValues } from '@/lib/types';
import { donorFormSchema } from '@/lib/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Gift, Building, Loader2, Save, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useAccount } from '@/hooks/use-account';
import { query, collectionGroup, where, doc, updateDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function DonorDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { accountId } = useAccount();
    const { toast } = useToast();
    const donorId = typeof params.id === 'string' ? params.id : '';

    const { donors, isLoading: isLoadingDonors } = useDonors();
    const { auctions, isLoading: isLoadingAuctions } = useAuctions();
    
    const [isSaving, setIsSaving] = useState(false);

    // Targeted query for items belonging to this donor across all auctions in this account.
    const itemsQuery = useMemoFirebase(
        () => (firestore && accountId && donorId
            ? query(
                collectionGroup(firestore, 'items'),
                where('accountId', '==', accountId),
                where('donorId', '==', donorId)
              )
            : null),
        [firestore, accountId, donorId]
    );

    const { data: donorItems, isLoading: isLoadingItems } = useCollection<Item>(itemsQuery);

    const donor = useMemo(() => {
        return donors.find(d => d.id === donorId);
    }, [donors, donorId]);

    const form = useForm<DonorFormValues>({
        resolver: zodResolver(donorFormSchema),
        defaultValues: {
            businessName: '',
            firstName: '',
            lastName: '',
            type: 'Individual',
            contactPerson: '',
            email: '',
            phone: '',
            address: { street: '', city: '', state: 'ID', zip: '' }
        }
    });

    const { isDirty } = form.formState;
    const donorType = form.watch('type');

    useEffect(() => {
        if (donor) {
            form.reset({
                businessName: donor.businessName || donor.name || '',
                firstName: donor.firstName || '',
                lastName: donor.lastName || '',
                type: donor.type || 'Individual',
                contactPerson: donor.contactPerson || '',
                email: donor.email || '',
                phone: donor.phone || '',
                address: {
                    street: donor.address?.street || '',
                    city: donor.address?.city || '',
                    state: donor.address?.state || 'ID',
                    zip: donor.address?.zip || ''
                }
            });
        }
    }, [donor, form]);

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/[^\d]/g, '');
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        }
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
        const formatted = formatPhoneNumber(e.target.value);
        onChange(formatted);
    };

    const onSave = async (values: DonorFormValues) => {
        if (!firestore || !accountId || !donorId) return;
        setIsSaving(true);
        try {
            const donorRef = doc(firestore, 'accounts', accountId, 'donors', donorId);
            // Auto-categorization logic
            const updatePayload = {
                ...values,
                isBusiness: values.type === 'Business' || !!values.businessName
            };
            await updateDoc(donorRef, updatePayload);
            toast({
                title: "Profile Synced",
                description: `Successfully updated details for ${values.businessName}.`,
            });
            form.reset(values); // Reset dirty state to new values
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message || "An unexpected error occurred.",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const itemsWithAuctionName = useMemo(() => {
        if (!donorItems || !auctions) return [];
        return donorItems.map(item => {
            const auction = auctions.find(a => a.id === item.auctionId);
            return { ...item, auctionName: auction?.name || 'Unknown Auction' };
        });
    }, [donorItems, auctions]);

    if (isLoadingDonors || isLoadingAuctions || isLoadingItems) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Loading donor details...</p>
            </div>
        );
    }

    if (!donor) {
        return (
             <div className="text-center py-10">
                <h2 className="text-xl font-bold">Donor Not Found</h2>
                <Button onClick={() => router.push('/dashboard/donors')} className="mt-4">Back to Donors List</Button>
            </div>
        );
    }

    const totalValueDonated = itemsWithAuctionName.reduce((sum, item) => sum + item.estimatedValue, 0);

    return (
        <div className="grid gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/dashboard/donors">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Donors</span>
                        </Link>
                    </Button>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Donor Profile Management
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {isDirty && (
                        <Button variant="ghost" size="sm" onClick={() => form.reset()} disabled={isSaving}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Discard Changes
                        </Button>
                    )}
                    <Button 
                        size="sm" 
                        onClick={form.handleSubmit(onSave)} 
                        disabled={!isDirty || isSaving}
                        className="bg-primary text-primary-foreground"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Form {...form}>
                        <form className="space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4 border-b bg-muted/30 pb-4">
                                    <Avatar className="h-14 w-14">
                                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                            {form.watch('type') === 'Business' ? <Building /> : <Gift />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <CardTitle className="text-xl">Entity Information</CardTitle>
                                        <CardDescription>Primary identity and donor type.</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Donor Type</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Individual">Individual</SelectItem>
                                                        <SelectItem value="Business">Business</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <FormField
                                        control={form.control}
                                        name="businessName"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>{donorType === 'Business' ? 'Business Name' : 'Donor Display Name'}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                        <FormField
                                          control={form.control}
                                          name="firstName"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>{donorType === 'Business' ? 'Contact First Name' : 'First Name'}</FormLabel>
                                              <FormControl>
                                                <Input {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={form.control}
                                          name="lastName"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>{donorType === 'Business' ? 'Contact Last Name' : 'Last Name'}</FormLabel>
                                              <FormControl>
                                                <Input {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                    </div>

                                    {donorType === 'Business' && (
                                        <FormField
                                            control={form.control}
                                            name="contactPerson"
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel>Primary Position/Role</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. Owner, Manager" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="border-b bg-muted/30 pb-4">
                                    <CardTitle className="text-xl">Contact Information</CardTitle>
                                    <CardDescription>How to reach this donor for receipts or logistics.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="(555) 555-5555" 
                                                        {...field} 
                                                        onChange={(e) => handlePhoneChange(e, field.onChange)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="donor@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="border-b bg-muted/30 pb-4">
                                    <CardTitle className="text-xl">Mailing Address</CardTitle>
                                    <CardDescription>Required for donor acknowledgement letters.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <FormField
                                        control={form.control}
                                        name="address.street"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Street Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123 Main St" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                        <FormField
                                            control={form.control}
                                            name="address.city"
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel>City</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="City" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address.state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>State</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="ID" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="ID">ID</SelectItem>
                                                            <SelectItem value="WA">WA</SelectItem>
                                                            <SelectItem value="OR">OR</SelectItem>
                                                            <SelectItem value="MT">MT</SelectItem>
                                                            <SelectItem value="CA">CA</SelectItem>
                                                            <SelectItem value="NV">NV</SelectItem>
                                                            <SelectItem value="UT">UT</SelectItem>
                                                            <SelectItem value="WY">WY</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address.zip"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>ZIP</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="83837" {...field} maxLength={5} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </form>
                    </Form>
                </div>

                <div className="space-y-6">
                    <Card className="border-l-4 border-l-primary">
                        <CardHeader>
                            <CardTitle>Donation Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-muted-foreground text-sm">Items Donated</span>
                                <span className="font-bold">{itemsWithAuctionName.length}</span>
                            </div>
                             <div className="flex justify-between pt-2">
                                <span className="text-muted-foreground text-sm font-semibold">Total Value</span>
                                <span className="text-xl font-black text-primary">{formatCurrency(totalValueDonated)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>History</CardTitle>
                            <CardDescription>
                                Items donated by {form.watch('businessName') || 'this donor'}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Item</TableHead>
                                        <TableHead className="text-right pr-6">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemsWithAuctionName.length > 0 ? (
                                        itemsWithAuctionName.map(item => (
                                            <TableRow key={item.id} onClick={() => router.push(`/dashboard/auctions/${item.auctionId}/items/${item.id}`)} className="cursor-pointer">
                                                <TableCell className="pl-6 font-medium">
                                                    {item.name}
                                                    <p className="text-[10px] text-muted-foreground uppercase">{item.auctionName}</p>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 font-mono text-xs">{formatCurrency(item.estimatedValue)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground py-8 text-xs">
                                                No historical donations.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, updateDoc, arrayUnion, collection } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Item, ItemFormValues, Category, Lot, Auction, Donor, CategoryFormValues } from "@/lib/types";
import { itemFormSchema } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Combobox } from "./ui/combobox";
import { AddDonorDialog } from "./add-donor-dialog";
import { EditCategoryDialog } from "./edit-category-dialog";
import { PlusCircle, Loader2 } from "lucide-react";
import { ImageUploader } from "./image-uploader";


export function EditItemForm({
  onSuccess,
  item,
  categories,
  lots,
  auctionType,
  isSubmitting,
  submitButtonText = "Update Item",
  accountId,
}: {
  onSuccess: (data: ItemFormValues) => void;
  item: Item | null;
  categories: Category[];
  lots: Lot[];
  auctionType: Auction['type'];
  isSubmitting: boolean;
  submitButtonText?: string;
  accountId: string;
}) {
  const { toast } = useToast();
  const params = useParams();
  const firestore = useFirestore();
  
  const getAuctionId = () => {
    if (params.id && typeof params.id === 'string') return params.id;
    if (params.auctionId && typeof params.auctionId === 'string') return params.auctionId;
    return '';
  }
  const auctionId = getAuctionId();

  const [isAddDonorOpen, setIsAddDonorOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  const donorsRef = useMemoFirebase(
    () => (firestore && accountId ? collection(firestore, 'accounts', accountId, 'donors') : null),
    [firestore, accountId]
  );
  const { data: donorsData, isLoading: isLoadingDonors } = useCollection<Donor>(donorsRef);
  const donors = donorsData || [];

  const defaultValues = item
    ? {
        sku: item.sku?.toString(),
        name: item.name,
        description: item.description,
        estimatedValue: item.estimatedValue,
        categoryId: item.category.name,
        lotId: item.lotId,
        donorId: item.donorId,
        imageUrl: item.imageUrl || "",
        assignedRunner: item.assignedRunner || "",
      }
    : {
        sku: "",
        name: "",
        description: "",
        estimatedValue: 0,
        categoryId: "",
        lotId: undefined,
        donorId: undefined,
        imageUrl: "",
        assignedRunner: "",
      };

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (item) {
      form.reset({
        sku: item.sku?.toString(),
        name: item.name,
        description: item.description || "",
        estimatedValue: item.estimatedValue,
        categoryId: item.category.name,
        lotId: item.lotId,
        donorId: item.donorId,
        imageUrl: item.imageUrl || "",
        assignedRunner: item.assignedRunner || "",
      });
    }
  }, [item, form]);

  async function onSubmit(values: ItemFormValues) {
    try {
      const submissionValues = { ...values };
      
      if (submissionValues.lotId === 'none') {
        submissionValues.lotId = undefined;
      }

      await onSuccess(submissionValues);
    } catch (error) {
      console.error("Update failed in EditItemForm:", error);
    }
  }
  
  const showLotsDropdown = (auctionType === 'Silent' || auctionType === 'Hybrid') && lots.length > 0;
  
  const donorOptions = donors.map(donor => ({
    value: donor.id,
    label: donor.name,
  }));
  
  const handleDonorAdded = (newDonor: Donor) => {
    form.setValue('donorId', newDonor.id);
  }

  const handleCategoryAdded = (values: CategoryFormValues) => {
    if (!auctionId || !accountId || !firestore) return;
    const auctionDocRef = doc(firestore, 'accounts', accountId, 'auctions', auctionId);
    updateDoc(auctionDocRef, {
        categories: arrayUnion({ ...values, id: `cat-${Date.now()}` })
    });
    toast({ title: "Category Added", description: `You can now select "${values.name}" from the list.`});
    setIsAddCategoryOpen(false);
  }

  return (
      <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
           <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Image (Optional)</FormLabel>
                <FormControl>
                  <ImageUploader
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 1001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Must be unique within this auction.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Vintage Leather Jacket" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="A detailed description of the item"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="estimatedValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <Button type="button" size="sm" variant="outline" onClick={() => setIsAddCategoryOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="donorId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Donor (Optional)</FormLabel>
                   <div className="flex items-center gap-2">
                      <Combobox
                        options={donorOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select a donor..."
                        searchPlaceholder="Search donors..."
                        noResultsText="No donor found."
                        disabled={isLoadingDonors}
                        className="w-full"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => setIsAddDonorOpen(true)}>
                         <PlusCircle className="mr-2 h-4 w-4" /> New Donor
                      </Button>
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedRunner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Runner (e.g. Assigned Child)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter runner name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showLotsDropdown && (
            <FormField
              control={form.control}
              name="lotId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lot (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to a lot" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">-- No Lot --</SelectItem>
                      {lots.map((lot) => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : submitButtonText}
          </Button>
        </form>
      </Form>
       <AddDonorDialog 
        isOpen={isAddDonorOpen}
        onClose={() => setIsAddDonorOpen(false)}
        onSuccess={handleDonorAdded}
        accountId={accountId}
      />
       <EditCategoryDialog
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSubmit={handleCategoryAdded}
        title="Add New Category"
        description="Create a new category. It will be available in the dropdown after creation."
        submitButtonText="Add Category"
      />
    </>
  );
}

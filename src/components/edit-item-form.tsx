
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import type { Item, ItemFormValues, Category, Lot, Auction } from "@/lib/types";
import { itemFormSchema } from "@/lib/types";
import { ImageUploader } from "./image-uploader";

export function EditItemForm({
  onSuccess,
  item,
  categories,
  lots,
  auctionType,
  submitButtonText = "Update Item",
}: {
  onSuccess: (data: ItemFormValues) => void;
  item: Item | null;
  categories: Category[];
  lots: Lot[];
  auctionType: Auction['type'];
  submitButtonText?: string;
}) {
  const { toast } = useToast();

  const defaultValues = item
    ? {
        name: item.name,
        description: item.description,
        estimatedValue: item.estimatedValue,
        categoryId: item.category.name,
        imageDataUri: item.imageDataUri,
        lotId: item.lotId,
      }
    : {
        name: "",
        description: "",
        estimatedValue: 0,
        categoryId: "",
        imageDataUri: "",
        lotId: undefined,
      };

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        description: item.description,
        estimatedValue: item.estimatedValue,
        categoryId: item.category.name,
        imageDataUri: item.imageDataUri,
        lotId: item.lotId,
      });
    }
  }, [item, form]);

  function onSubmit(values: ItemFormValues) {
    const submissionValues = { ...values };
    
    // If user selects the "No Lot" option, set lotId to undefined
    if (submissionValues.lotId === 'none') {
      submissionValues.lotId = undefined;
    }

    toast({
      title: "Item Updated!",
      description: `The "${values.name}" item has been successfully updated.`,
    });
    onSuccess(submissionValues);
  }
  
  const showLotsDropdown = (auctionType === 'Silent' || auctionType === 'Hybrid') && lots.length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="imageDataUri"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Image</FormLabel>
              <FormControl>
                 <ImageUploader 
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Vintage Leather Jacket" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <Button type="submit">{submitButtonText}</Button>
      </form>
    </Form>
  );
}

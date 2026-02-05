
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";

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
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import type { Auction, FormValues } from "@/lib/types";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { auctionFormSchema } from "@/lib/types";


export function CreateAuctionForm({
  onSuccess,
  auction,
  submitButtonText = "Create Auction"
}: {
  onSuccess?: (data: FormValues) => void;
  auction?: Auction | null;
  submitButtonText?: string;
}) {
  const { toast } = useToast();
  
  const defaultValues = auction ? {
    name: auction.name,
    description: auction.description,
    type: auction.type,
    startDate: new Date(auction.startDate),
    isPublic: auction.isPublic || false,
  } : {
    name: "",
    description: "",
    type: "Silent",
    startDate: undefined,
    isPublic: false,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(auctionFormSchema),
    // @ts-ignore
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (auction) {
      form.reset({
        name: auction.name,
        description: auction.description,
        type: auction.type,
        startDate: new Date(auction.startDate),
        isPublic: auction.isPublic || false,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        type: "Silent",
        // @ts-ignore
        startDate: undefined,
        isPublic: false,
      });
    }
  }, [auction, form]);


  function onSubmit(values: FormValues) {
    toast({
      title: auction ? "Auction Updated!" : "Auction Created!",
      description: `The "${values.name}" auction has been successfully ${auction ? 'updated' : 'created'}.`,
    });
    onSuccess?.(values);
    if (!auction) {
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auction Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Annual Charity Gala" {...field} />
              </FormControl>
              <FormDescription>
                This is the public name of your auction.
              </FormDescription>
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
                  placeholder="Tell us a little bit about this auction"
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Auction Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an auction type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Live">Live</SelectItem>
                    <SelectItem value="Silent">Silent</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                 <DatePicker date={field.value} setDate={field.onChange} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Make Catalog Public
                </FormLabel>
                <FormDescription>
                  Allow anyone with the link to view the auction catalog.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit">{submitButtonText}</Button>
      </form>
    </Form>
  );
}

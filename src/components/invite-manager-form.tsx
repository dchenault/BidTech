
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Auction, InviteManagerFormValues } from "@/lib/types";
import { inviteManagerSchema } from "@/lib/types";

interface InviteManagerFormProps {
  auctions: Auction[];
  onSubmit: (values: InviteManagerFormValues) => void;
}

export function InviteManagerForm({ auctions, onSubmit }: InviteManagerFormProps) {
  const form = useForm<InviteManagerFormValues>({
    resolver: zodResolver(inviteManagerSchema),
    defaultValues: {
      email: "",
      auctionId: undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="manager@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="auctionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Auction to Manage</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an auction" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {auctions.map((auction) => (
                    <SelectItem key={auction.id} value={auction.id}>
                      {auction.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Send Invitation</Button>
      </form>
    </Form>
  );
}

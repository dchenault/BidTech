
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";

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
import type { Donor, DonorFormValues } from "@/lib/types";
import { donorFormSchema } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export function EditDonorForm({
  onSuccess,
  donor,
  submitButtonText = "Save Donor"
}: {
  onSuccess?: (data: DonorFormValues) => void;
  donor?: Donor | null;
  submitButtonText?: string;
}) {
  
  const defaultValues = useMemo<DonorFormValues>(() => donor ? {
    name: donor.name,
    type: donor.type,
    contactPerson: donor.contactPerson || '',
    email: donor.email || '',
    phone: donor.phone || '',
    address: {
      street: donor.address?.street || '',
      city: donor.address?.city || '',
      state: donor.address?.state || '',
      zip: donor.address?.zip || ''
    }
  } : {
    name: "",
    type: "Individual",
    contactPerson: "",
    email: "",
    phone: "",
    address: { street: "", city: "", state: "", zip: "" }
  }, [donor]);

  const form = useForm<DonorFormValues>({
    resolver: zodResolver(donorFormSchema),
    defaultValues,
  });

  const donorType = form.watch('type');

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);


  function onSubmit(values: DonorFormValues) {
    if (onSuccess) {
      onSuccess(values);
    }
    if (!donor) {
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Donor Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Individual" />
                    </FormControl>
                    <FormLabel className="font-normal">Individual</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Business" />
                    </FormControl>
                    <FormLabel className="font-normal">Business</FormLabel>
                  </FormItem>
                </RadioGroup>
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
              <FormLabel>{donorType === 'Business' ? 'Business Name' : 'Full Name'}</FormLabel>
              <FormControl>
                  <Input {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        {donorType === 'Business' && (
            <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contact Person (Optional)</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
         <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
            <FormLabel>Address</FormLabel>
            <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
                <FormItem>
                <FormControl>
                    <Input placeholder="Street Address" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                 <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                    <FormItem>
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
                    <FormControl>
                        <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="address.zip"
                render={({ field }) => (
                    <FormItem>
                    <FormControl>
                        <Input placeholder="ZIP Code" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </div>

        <Button type="submit">{submitButtonText}</Button>
      </form>
    </Form>
  );
}

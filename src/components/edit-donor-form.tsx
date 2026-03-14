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
import { Loader2 } from "lucide-react";

export function EditDonorForm({
  onSuccess,
  donor,
  submitButtonText = "Save Donor",
  isSubmitting,
}: {
  onSuccess?: (data: DonorFormValues) => void;
  donor?: Donor | null;
  submitButtonText?: string;
  isSubmitting?: boolean;
}) {
  
  const defaultValues = useMemo<DonorFormValues>(() => {
    if (!donor) {
      return {
        businessName: "",
        firstName: "",
        lastName: "",
        type: "Individual",
        contactPerson: "",
        email: "",
        phone: "",
        address: { street: "", city: "", state: "ID", zip: "" }
      };
    }

    // Migration Logic: Prefer businessName, fallback to legacy name
    const businessName = donor.businessName || donor.name || "";

    // Migration Logic: Handle legacy string-based address field
    let street = "";
    let city = "";
    let state = "ID";
    let zip = "";

    if (typeof donor.address === 'string') {
      street = donor.address;
    } else if (donor.address) {
      street = donor.address.street || "";
      city = donor.address.city || "";
      state = donor.address.state || "ID";
      zip = donor.address.zip || "";
    }

    return {
      businessName,
      firstName: donor.firstName || "",
      lastName: donor.lastName || "",
      type: donor.type,
      contactPerson: donor.contactPerson || '',
      email: donor.email || '',
      phone: donor.phone || '',
      address: {
        street,
        city,
        state,
        zip
      }
    };
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
      // Logic for migration script: if businessName is not empty, isBusiness is true
      const finalData = {
        ...values,
        isBusiness: values.type === 'Business' || !!values.businessName
      };
      onSuccess(finalData as DonorFormValues);
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
          name="businessName"
          render={({ field }) => (
              <FormItem>
              <FormLabel>{donorType === 'Business' ? 'Business Name' : 'Display/Legacy Name'}</FormLabel>
              <FormControl>
                  <Input {...field} />
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
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
                <FormItem>
                <FormLabel>Position/Role (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Marketing Director" {...field} />
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
                <Input type="email" placeholder="email@example.com" {...field} />
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
                <Input placeholder="(555) 555-5555" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4">
            <FormLabel>Address Information</FormLabel>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Saving...' : submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
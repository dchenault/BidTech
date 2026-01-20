
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useMemo } from "react";

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
import { useToast } from "@/hooks/use-toast";
import type { Patron, PatronFormValues } from "@/lib/types";

const formSchema = z.object({
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


export function EditPatronForm({
  onSuccess,
  patron,
  submitButtonText = "Update Patron"
}: {
  onSuccess?: (data: PatronFormValues) => void;
  patron?: Patron | null;
  submitButtonText?: string;
}) {
  const { toast } = useToast();
  
  const defaultValues = useMemo(() => patron ? {
    firstName: patron.firstName,
    lastName: patron.lastName,
    email: patron.email,
    phone: patron.phone || '',
    address: {
      street: patron.address?.street || '',
      city: patron.address?.city || '',
      state: patron.address?.state || '',
      zip: patron.address?.zip || ''
    }
  } : {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: { street: "", city: "", state: "", zip: "" }
  }, [patron]);

  const form = useForm<PatronFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);


  function onSubmit(values: PatronFormValues) {
    const action = patron ? "Updated" : "Added";
    toast({
      title: `Patron ${action}!`,
      description: `The details for ${values.firstName} ${values.lastName} have been successfully ${action.toLowerCase()}.`,
    });
    if (onSuccess) {
      onSuccess(values);
    }
    if (!patron) {
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>First Name</FormLabel>
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
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
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

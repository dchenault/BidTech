
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Patron, PatronFormValues } from "@/lib/types";
import { patronFormSchema } from "@/lib/types";


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
    email: patron.email || '',
    phone: patron.phone || '',
    address: {
      street: patron.address?.street || '',
      city: patron.address?.city || '',
      state: patron.address?.state || 'ID',
      zip: patron.address?.zip || ''
    }
  } : {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: { street: "", city: "", state: "ID", zip: "" }
  }, [patron]);

  const form = useForm<PatronFormValues>({
    resolver: zodResolver(patronFormSchema),
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
        </div>
        
        <div className="space-y-4">
            <FormLabel>Mailing Address</FormLabel>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                 <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
                    <FormControl>
                        <Input placeholder="ZIP" {...field} maxLength={5} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </div>

        <Button type="submit" className="w-full">{submitButtonText}</Button>
      </form>
    </Form>
  );
}

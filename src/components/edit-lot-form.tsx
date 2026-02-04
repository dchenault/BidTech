
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
import type { Lot, LotFormValues } from "@/lib/types";
import { lotFormSchema } from "@/lib/types";

export function EditLotForm({
  onSuccess,
  lot,
  submitButtonText = "Save Changes"
}: {
  onSuccess: (data: LotFormValues) => void;
  lot?: Lot | null;
  submitButtonText?: string;
}) {
  
  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: {
      name: lot?.name || "",
    },
  });

  useEffect(() => {
    form.reset({ name: lot?.name || "" });
  }, [lot, form]);

  function onSubmit(values: LotFormValues) {
    onSuccess(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lot Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fine Wines" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{submitButtonText}</Button>
      </form>
    </Form>
  );
}

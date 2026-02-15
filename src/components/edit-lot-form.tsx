
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
import { DatePicker } from "./ui/date-picker";

export function EditLotForm({
  onSuccess,
  lot,
  submitButtonText = "Save Changes"
}: {
  onSuccess: (data: { name: string, closingDate?: Date }) => void;
  lot?: Lot | null;
  submitButtonText?: string;
}) {

  const getInitialValues = (lot: Lot | null | undefined) => {
    let closingDate: Date | undefined = undefined;
    let closingTime: string = "";
    if (lot?.closingDate) {
        const date = new Date(lot.closingDate);
        if (!isNaN(date.getTime())) { // Check if date is valid
            closingDate = date;
            closingTime = date.toTimeString().slice(0, 5); // "HH:mm"
        }
    }
    return {
        name: lot?.name || "",
        closingDate: closingDate,
        closingTime: closingTime
    };
  };
  
  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: getInitialValues(lot),
  });

  useEffect(() => {
    form.reset(getInitialValues(lot));
  }, [lot, form]);

  function onSubmit(values: LotFormValues) {
    let combinedDate: Date | undefined = undefined;
    if (values.closingDate && values.closingTime) {
        combinedDate = new Date(values.closingDate);
        const [hours, minutes] = values.closingTime.split(':').map(Number);
        combinedDate.setHours(hours, minutes, 0, 0);
    }
    onSuccess({ name: values.name, closingDate: combinedDate });
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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
                control={form.control}
                name="closingDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Closing Date (Optional)</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="closingTime"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Closing Time (Optional)</FormLabel>
                    <FormControl>
                    <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <Button type="submit">{submitButtonText}</Button>
      </form>
    </Form>
  );
}


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
import { useToast } from "@/hooks/use-toast";
import { LotFormValues, lotFormSchema } from "@/lib/types";
import { DatePicker } from "./ui/date-picker";

export function AddLotForm({
  onSuccess,
  submitButtonText = "Add Lot",
}: {
  onSuccess: (data: { name: string; closingDate?: Date }) => void;
  submitButtonText?: string;
}) {
  const { toast } = useToast();

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: {
      name: "",
      closingDate: undefined,
      closingTime: "",
    },
  });

  function onSubmit(values: LotFormValues) {
    let combinedDate: Date | undefined = undefined;
    if (values.closingDate && values.closingTime) {
        combinedDate = new Date(values.closingDate);
        const [hours, minutes] = values.closingTime.split(':').map(Number);
        combinedDate.setHours(hours, minutes, 0, 0);
    }

    toast({
      title: "Lot Added!",
      description: `The "${values.name}" lot has been successfully added.`,
    });
    onSuccess({ name: values.name, closingDate: combinedDate });
    form.reset();
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


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

export function AddLotForm({
  onSuccess,
  submitButtonText = "Add Lot",
}: {
  onSuccess: (data: LotFormValues) => void;
  submitButtonText?: string;
}) {
  const { toast } = useToast();

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(values: LotFormValues) {
    toast({
      title: "Lot Added!",
      description: `The "${values.name}" lot has been successfully added.`,
    });
    onSuccess(values);
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
        <Button type="submit">{submitButtonText}</Button>
      </form>
    </Form>
  );
}

    
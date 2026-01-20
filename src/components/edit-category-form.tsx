
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
import type { Category, CategoryFormValues } from "@/lib/types";
import { categoryFormSchema } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function EditCategoryForm({
  onSuccess,
  category,
  submitButtonText = "Save"
}: {
  onSuccess: (data: CategoryFormValues) => void;
  category?: Category | null;
  submitButtonText?: string;
}) {
  const { toast } = useToast();
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || "",
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({ name: category.name });
    } else {
      form.reset({ name: "" });
    }
  }, [category, form]);

  function onSubmit(values: CategoryFormValues) {
    toast({
      title: category ? "Category Updated!" : "Category Added!",
      description: `The category "${values.name}" has been successfully saved.`,
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
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fine Art" {...field} />
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

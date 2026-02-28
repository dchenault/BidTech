
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { teamMemberSchema, type TeamMemberFormValues, type Auction } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface AddTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TeamMemberFormValues) => Promise<void>;
  auctions: Auction[];
}

export function AddTeamMemberDialog({
  isOpen,
  onClose,
  onSubmit,
  auctions,
}: AddTeamMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      email: "",
      role: "staff",
      assignedAuctions: [],
    },
  });

  const selectedRole = form.watch("role");

  const handleFormSubmit = async (values: TeamMemberFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Invite a new user to manage your auctions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin (Global Access)</SelectItem>
                      <SelectItem value="staff">Staff (Limited Access)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Admins can manage all account settings and billing. Staff can only access assigned auctions.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "staff" && (
              <FormField
                control={form.control}
                name="assignedAuctions"
                render={() => (
                  <FormItem>
                    <FormLabel>Assigned Auctions</FormLabel>
                    <ScrollArea className="h-[150px] rounded-md border p-4">
                      <div className="space-y-4">
                        {auctions.map((auction) => (
                          <FormField
                            key={auction.id}
                            control={form.control}
                            name="assignedAuctions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={auction.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(auction.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, auction.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== auction.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {auction.name}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                        {auctions.length === 0 && (
                          <p className="text-sm text-muted-foreground">No auctions available.</p>
                        )}
                      </div>
                    </ScrollArea>
                    <FormDescription>
                      Select which auctions this staff member should manage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

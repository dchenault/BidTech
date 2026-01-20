
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import type { Patron, PatronFormValues } from "@/lib/types";
import { EditPatronForm } from "./edit-patron-form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RegisterPatronDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allPatrons: Patron[];
  registeredPatrons: (Patron & { biddingNumber: number })[];
  onRegister: (patron: Patron, bidderNumber: number) => void;
  onAddNewPatron: (values: PatronFormValues) => Promise<Patron | undefined | void>;
  isLoadingPatrons: boolean;
}

export function RegisterPatronDialog({
  isOpen,
  onClose,
  allPatrons,
  registeredPatrons,
  onRegister,
  onAddNewPatron,
  isLoadingPatrons
}: RegisterPatronDialogProps) {
  const [step, setStep] = useState<"search" | "add" | "assign">("search");
  const [selectedPatron, setSelectedPatron] = useState<Patron | null>(null);
  const [bidderNumber, setBidderNumber] = useState<number | string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [addFormKey, setAddFormKey] = useState(Date.now());


  const registeredPatronIds = useMemo(() => (registeredPatrons || []).map(p => p.id), [registeredPatrons]);

  const availablePatrons = useMemo(() => {
    if (!allPatrons || !registeredPatronIds) return [];
    return allPatrons.filter(p => !registeredPatronIds.includes(p.id));
  }, [allPatrons, registeredPatronIds]);

  const filteredPatrons = useMemo(() => {
    if (!searchQuery) return [];
    return availablePatrons.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availablePatrons, searchQuery]);

  useEffect(() => {
    // Reset state when dialog opens or closes
    if (isOpen) {
      setStep("search");
      setSelectedPatron(null);
      setBidderNumber("");
      setSearchQuery("");
      setIsSubmitting(false);
      setAddFormKey(Date.now()); // Reset form key
    }
  }, [isOpen]);

  const handlePatronSelect = (patron: Patron) => {
    setSelectedPatron(patron);
    setStep("assign");
  };

  const handleAddNewPatron = async (values: PatronFormValues) => {
    setIsSubmitting(true);
    try {
        const newPatron = await onAddNewPatron(values);
        // The hook architecture might not return the new patron immediately.
        // We will transition and let the main patrons list update.
        // For now, we go back to the search step with a toast message.
         toast({
            title: "Patron Added",
            description: `${values.firstName} ${values.lastName} has been added to the master list. You can now search for them to register.`
        });
        setStep("search");
        setAddFormKey(Date.now()); // Reset form for next time

    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not add new patron."})
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRegister = () => {
    const num = typeof bidderNumber === 'string' ? parseInt(bidderNumber, 10) : bidderNumber;
    if (!selectedPatron) {
      toast({ variant: "destructive", title: "No Patron Selected" });
      return;
    }
    if (!num || num <= 0) {
      toast({ variant: "destructive", title: "Invalid Bidder Number", description: "Please enter a positive number." });
      return;
    }

    // Check for uniqueness
    const isBidderNumberTaken = registeredPatrons.some(p => p.biddingNumber === num);
    if (isBidderNumberTaken) {
        toast({
            variant: "destructive",
            title: "Bidder Number Taken",
            description: `Bidder number ${num} is already assigned to another patron in this auction. Please choose a different number.`
        });
        return;
    }

    onRegister(selectedPatron, num);
  };
  
  const renderContent = () => {
    switch (step) {
      case "search":
        return (
          <>
            <DialogHeader>
              <DialogTitle>Register Patron</DialogTitle>
              <DialogDescription>Search for an existing patron to register for this auction.</DialogDescription>
            </DialogHeader>
            <Command className="rounded-lg border shadow-md">
              <CommandInput 
                placeholder="Search by name or email..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoadingPatrons ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading patrons...</div>
                ) : (
                    <CommandEmpty>
                        <div className="p-4 text-center text-sm">
                            <p className="mb-2">No patrons found.</p>
                            <Button size="sm" onClick={() => setStep("add")}>Add New Patron</Button>
                        </div>
                    </CommandEmpty>
                )}
                {filteredPatrons.map((patron) => (
                  <CommandItem
                    key={patron.id}
                    onSelect={() => handlePatronSelect(patron)}
                    value={`${patron.firstName} ${patron.lastName} ${patron.email}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{patron.firstName} {patron.lastName}</span>
                      <span className="text-xs text-muted-foreground">{patron.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
             <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
            </DialogFooter>
          </>
        );
      case "add":
        return (
          <>
            <DialogHeader>
              <DialogTitle>Add New Patron</DialogTitle>
              <DialogDescription>
                This patron was not found. Add their details below to create a new patron record.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <EditPatronForm 
                key={addFormKey}
                onSuccess={handleAddNewPatron}
                submitButtonText={isSubmitting ? "Adding..." : "Add and Continue"}
              />
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={() => setStep("search")} disabled={isSubmitting}>Back to Search</Button>
            </DialogFooter>
          </>
        );
      case "assign":
        return (
          <>
            <DialogHeader>
              <DialogTitle>Assign Bidder Number</DialogTitle>
              <DialogDescription>
                Assign a unique bidder number to {selectedPatron?.firstName} {selectedPatron?.lastName}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bidderNumber" className="text-right">
                  Bidder #
                </Label>
                <Input
                  id="bidderNumber"
                  type="number"
                  value={bidderNumber}
                  onChange={(e) => setBidderNumber(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g. 101"
                  required
                  autoFocus
                />
              </div>
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={() => setStep("search")}>Back to Search</Button>
                <Button onClick={handleRegister}>Register Patron</Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

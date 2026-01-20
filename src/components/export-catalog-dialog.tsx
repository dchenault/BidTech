
"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSortableList, type GroupedItems } from "@/hooks/use-sortable-list";
import { SortableItem } from "@/components/sortable-item";
import { Item, Lot } from "@/lib/types";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface ExportCatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  lots: Lot[];
  onSubmit: (orderedItems: Item[], lots: Lot[]) => void;
  isLoading: boolean;
}

function groupItems(items: Item[], lots: Lot[]): GroupedItems {
    const lotsById = new Map(lots.map(l => [l.id, l.name]));
    const nonDonations = items.filter(item => !item.sku.toString().startsWith('DON-'));

    return nonDonations.reduce((acc: GroupedItems, item) => {
        const categoryName = item.category?.name || 'Uncategorized';
        if (item.lotId) { // Silent Item
            const lotName = lotsById.get(item.lotId) || 'Unassigned Silent Items';
            if (!acc.silent[lotName]) {
                acc.silent[lotName] = {};
            }
            if (!acc.silent[lotName][categoryName]) {
                acc.silent[lotName][categoryName] = [];
            }
            acc.silent[lotName][categoryName].push(item);
        } else { // Live Item
            if (!acc.live[categoryName]) {
                acc.live[categoryName] = [];
            }
            acc.live[categoryName].push(item);
        }
        return acc;
    }, { live: {}, silent: {} });
}


export function ExportCatalogDialog({
  isOpen,
  onClose,
  items,
  lots,
  onSubmit,
  isLoading,
}: ExportCatalogDialogProps) {

  const initialGroupedItems = useMemo(() => groupItems(items, lots), [items, lots]);
  
  const { sortedItems, sensors, handleDragEnd } = useSortableList(initialGroupedItems);

  const handleSubmit = () => {
    // Flatten the sorted groups back into a single array for export
    const finalOrderedItems = [
      ...Object.values(sortedItems.live).flat(),
      ...Object.values(sortedItems.silent).flatMap(categories => Object.values(categories).flat())
    ];
    onSubmit(finalOrderedItems, lots);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sort and Export Catalog</DialogTitle>
          <DialogDescription>
            Drag and drop items within their groups to reorder them for the catalog export.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
             <div className="space-y-8">
              {/* Live Items Section */}
              <div>
                <h2 className="text-2xl font-bold mb-4 border-b-2 pb-2">Live Auction Items</h2>
                {Object.entries(sortedItems.live).map(([categoryName, categoryItems]) => (
                  <div key={categoryName} className="mb-4 pl-4">
                    <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Category: {categoryName}</h3>
                    <SortableItem.List
                      items={categoryItems}
                      sensors={sensors}
                      onDragEnd={(event) => handleDragEnd(event, 'live', categoryName)}
                      className="space-y-2"
                    >
                      {categoryItems.map((item) => (
                        <SortableItem key={item.id} id={item.id}>
                          <div className="flex items-center gap-4 w-full">
                            <SortableItem.DragHandle />
                            <Image
                              src={item.imageUrl || 'https://picsum.photos/seed/placeholder/40/40'}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover aspect-square"
                              data-ai-hint="item image"
                            />
                            <div className="flex-grow">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                            </div>
                          </div>
                        </SortableItem>
                      ))}
                    </SortableItem.List>
                  </div>
                ))}
              </div>

              {/* Silent Items Section */}
              <div>
                <h2 className="text-2xl font-bold mb-4 border-b-2 pb-2">Silent Auction Items</h2>
                {Object.entries(sortedItems.silent).map(([lotName, categories]) => (
                  <div key={lotName} className="mb-6 pl-4 border-l-4 border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-bold mb-3 text-primary">Lot: {lotName}</h3>
                    {Object.entries(categories).map(([categoryName, categoryItems]) => (
                      <div key={categoryName} className="mb-4 pl-4">
                        <h4 className="text-lg font-semibold mb-2 text-muted-foreground">Category: {categoryName}</h4>
                        <SortableItem.List
                          items={categoryItems}
                          sensors={sensors}
                          onDragEnd={(event) => handleDragEnd(event, 'silent', categoryName, lotName)}
                          className="space-y-2"
                        >
                          {categoryItems.map((item) => (
                            <SortableItem key={item.id} id={item.id}>
                              <div className="flex items-center gap-4 w-full">
                                <SortableItem.DragHandle />
                                <Image
                                  src={item.imageUrl || 'https://picsum.photos/seed/placeholder/40/40'}
                                  alt={item.name}
                                  width={40}
                                  height={40}
                                  className="rounded-md object-cover aspect-square"
                                  data-ai-hint="item image"
                                />
                                <div className="flex-grow">
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                                </div>
                              </div>
                            </SortableItem>
                          ))}
                        </SortableItem.List>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>Export Catalog</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

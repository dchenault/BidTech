
'use client';

import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Item } from '@/lib/types';


export type GroupedItems = {
  live: {
    [categoryName: string]: Item[];
  };
  silent: {
    [lotName: string]: {
      [categoryName: string]: Item[];
    };
  };
};

export function useSortableList(initialItems: GroupedItems) {
  const [sortedItems, setSortedItems] = useState(initialItems);

  useEffect(() => {
    // Update state if initialItems prop changes
    setSortedItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent, type: 'live' | 'silent', category: string, lot?: string) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
        setSortedItems((currentItems) => {
            const newItems = JSON.parse(JSON.stringify(currentItems)); // Deep copy
            let itemsToSort: Item[] | undefined;

            if (type === 'live') {
                itemsToSort = newItems.live[category];
            } else if (lot && newItems.silent[lot]?.[category]) {
                itemsToSort = newItems.silent[lot][category];
            }

            if (!itemsToSort) return currentItems;

            const oldIndex = itemsToSort.findIndex((item) => item.id === active.id);
            const newIndex = itemsToSort.findIndex((item) => item.id === over?.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const movedArray = arrayMove(itemsToSort, oldIndex, newIndex);
                if (type === 'live') {
                    newItems.live[category] = movedArray;
                } else if (lot) {
                    newItems.silent[lot][category] = movedArray;
                }
            }
            
            return newItems;
        });
    }
  }, []);

  return { sortedItems, setSortedItems, sensors, handleDragEnd };
}


"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { DndContext, type DragEndEvent, type DraggableAttributes, type UniqueIdentifier, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import { cn } from "@/lib/utils"

import { Command } from "./ui/command"

const SortableItemContext = React.createContext<{
  attributes: DraggableAttributes
  listeners: ReturnType<typeof useSortable>["listeners"]
} | null>(null)

function SortableItemPrimitive({
  id,
  children,
  className,
}: {
  id: UniqueIdentifier
  children: React.ReactNode
  className?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const context = React.useMemo(
    () => ({
      attributes,
      listeners,
    }),
    [attributes, listeners]
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    zIndex: isDragging ? 10 : "auto",
  }

  return (
    <SortableItemContext.Provider value={context}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative flex w-full items-center rounded-md border bg-background text-popover-foreground shadow-md transition-all",
          isDragging && "shadow-lg",
          className
        )}
      >
        {children}
      </div>
    </SortableItemContext.Provider>
  )
}

function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  const { attributes, listeners } = React.useContext(SortableItemContext)!

  return (
    <button
      className="flex cursor-grab items-center justify-center p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      {...attributes}
      {...listeners}
      {...props}
    >
      <GripVertical className="h-5 w-5" />
    </button>
  )
}


type SortableListProps<T extends { id: UniqueIdentifier }> = {
  items: T[];
  onDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  children: React.ReactNode;
  className?: string;
};

function SortableList<T extends { id: UniqueIdentifier }>({ items, onDragEnd, sensors, children, className }: SortableListProps<T>) {
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <Command className={cn("overflow-visible bg-transparent", className)}>
            {children}
        </Command>
      </SortableContext>
    </DndContext>
  );
}


export const SortableItem = Object.assign(SortableItemPrimitive, {
  DragHandle: DragHandle,
  List: SortableList,
});

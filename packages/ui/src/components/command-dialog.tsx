"use client";

import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

type CommandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the dialog. */
  label: string;
  children: React.ReactNode;
  className?: string;
};

/** Floating panel near the top of the screen, used by the ⌘K palette. */
function CommandDialog({ open, onOpenChange, label, children, className }: CommandDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/50" />
        <Dialog.Popup
          aria-label={label}
          className={cn(
            "fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-md border border-line bg-surface text-foreground shadow-floating",
            "transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CommandDialog };

"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@estudos-ia/ui/lib/utils";
import * as React from "react";

import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The destructive action, shown as an outlined danger button. */
  confirmLabel: string;
  /** Keeps things as they are. */
  cancelLabel: string;
  onConfirm: () => void;
  pending?: boolean;
};

/** In-app confirmation for destructive actions; replaces window.confirm(). */
function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, pending }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/25 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/50" />
        <AlertDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border border-line bg-surface p-6 text-foreground shadow-floating",
            "transition-[opacity,transform] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
          )}
        >
          <AlertDialog.Title className="font-serif text-xl font-semibold">{title}</AlertDialog.Title>
          {description ? <AlertDialog.Description className="text-muted-foreground">{description}</AlertDialog.Description> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <AlertDialog.Close render={<Button variant="outline" />}>{cancelLabel}</AlertDialog.Close>
            <Button variant="danger" loading={pending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export { ConfirmDialog };

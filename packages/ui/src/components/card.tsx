import { cn } from "@estudos-ia/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const cardVariants = cva("rounded-md border border-line text-foreground", {
  variants: {
    variant: {
      default: "bg-surface",
      sunken: "bg-surface-sunken",
      // For a card that is a link or button as a whole.
      interactive:
        "bg-surface transition-colors hover:border-accent focus-visible:border-accent has-[a:focus-visible]:border-accent",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
    },
  },
  defaultVariants: { variant: "default", padding: "md" },
});

function Card({ className, variant, padding, ...props }: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return <div data-slot="card" className={cn(cardVariants({ variant, padding }), className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("font-serif text-xl font-semibold", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export { Card, CardDescription, CardTitle, cardVariants };

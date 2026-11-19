import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@estudos-ia/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";

/**
 * Variants follow the "Botão" board: one primary per screen, outline, ghost,
 * danger (outlined, so it never competes with an overdue badge) and link.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border font-sans font-medium whitespace-nowrap no-underline transition-colors duration-150 select-none active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "border-accent bg-accent text-accent-foreground hover:bg-[color-mix(in_srgb,var(--accent),var(--foreground)_14%)] active:bg-[color-mix(in_srgb,var(--accent),var(--foreground)_26%)]",
        outline:
          "border-line-strong bg-transparent text-foreground hover:bg-surface-sunken active:bg-[color-mix(in_srgb,var(--surface-sunken),var(--foreground)_8%)]",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-surface-sunken hover:text-foreground active:bg-[color-mix(in_srgb,var(--surface-sunken),var(--foreground)_8%)]",
        danger:
          "border-danger bg-transparent text-danger hover:bg-danger-soft active:bg-[color-mix(in_srgb,var(--danger-soft),var(--danger)_15%)]",
        link: "h-auto! min-h-0! rounded-none border-transparent px-0.5! text-accent underline decoration-1 underline-offset-[3px] hover:decoration-2 active:translate-y-0",
      },
      size: {
        sm: "min-h-9 px-3 text-sm",
        md: "min-h-11 px-4 text-[0.9375rem]",
        lg: "min-h-13 px-5 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { loading?: boolean };

function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Loader2Icon aria-hidden className="animate-spin" /> : null}
      {children}
    </ButtonPrimitive>
  );
}

/** Keyboard hint shown inside buttons and help text. */
function Kbd({ className, inverted, ...props }: React.ComponentProps<"kbd"> & { inverted?: boolean }) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "rounded-[3px] border px-1.5 font-mono text-xs leading-5 font-normal",
        inverted ? "border-accent-foreground/40" : "border-line text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants, Kbd };

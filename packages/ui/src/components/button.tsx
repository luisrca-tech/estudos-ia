import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@estudos-ia/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent font-sans font-medium whitespace-nowrap no-underline transition-colors select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none aria-busy:opacity-70 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:bg-accent/88",
        secondary: "bg-accent-soft text-foreground hover:bg-accent-soft/70",
        outline: "border-line-strong bg-surface text-foreground hover:border-foreground/40 hover:bg-surface-sunken",
        ghost: "text-foreground hover:bg-surface-sunken",
        danger: "border-danger/40 bg-danger-soft text-danger hover:border-danger",
        link: "h-auto rounded-none p-0 text-accent underline decoration-1 underline-offset-[3px] hover:decoration-2",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-5 text-base",
        icon: "size-10",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { loading?: boolean };

function Button({ className, variant, size, loading, disabled, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };

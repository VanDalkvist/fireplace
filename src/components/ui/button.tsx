import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[2px] text-xs font-mono transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-foreground hover:text-primary",
        primary:
          "bg-primary/10 text-primary hover:bg-primary/20",
        destructive:
          "text-destructive hover:bg-destructive/10",
        outline:
          "bg-transparent hover:bg-secondary text-muted hover:text-foreground",
        ghost:
          "hover:bg-secondary text-muted hover:text-foreground",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2 text-[11px]",
        lg: "h-9 px-4 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-[scale,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ever disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-ever-dk text-white hover:bg-acc-deep",
        secondary: "bg-white text-ever-dk shadow-card hover:bg-ever-lt",
        outline: "bg-white text-ever-dk shadow-card hover:bg-ever-lt",
        ghost: "text-mute hover:bg-ever-lt hover:text-ever-dk",
        destructive: "bg-destructive text-destructive-foreground",
        link: "text-ever-dk underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-11 px-5",
        sm: "h-10 min-h-10 px-4 text-[13px]",
        lg: "h-12 min-h-12 px-7",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  noPressScale?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, noPressScale, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "px-[22px] py-3 text-[15px]",
  md: "px-6 py-[13px] text-[15px]",
  lg: "px-[30px] py-4 text-base",
} as const;

const variants = {
  ever:
    "bg-ever text-white hover:bg-ever-dk hover:text-white",
  outline:
    "border border-edge bg-white text-ink hover:bg-ever-lt hover:text-ink",
  white:
    "bg-white text-ever-dk hover:bg-gold-lt hover:text-ever-dk",
  ghost:
    "border border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white",
  underline:
    "px-0 py-4 text-base text-ink shadow-[inset_0_-1px_0_var(--color-hair)] hover:text-ink hover:shadow-[inset_0_-2px_0_var(--color-gold-br)]",
} as const;

type DecaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href?: string;
  children: ReactNode;
};

export function DecaButton({
  variant = "ever",
  size = "md",
  href,
  className,
  children,
  type = "button",
  ...props
}: DecaButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-[6px] whitespace-nowrap transition-[background-color,border-color,box-shadow,color] duration-150",
    variant !== "underline" && sizes[size],
    variants[variant],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

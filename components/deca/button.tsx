import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "px-5 py-2.5 text-[13px]",
  md: "px-[22px] py-[13px] text-sm",
  lg: "px-[30px] py-4 text-base",
} as const;

const variants = {
  ever: "bg-ever-dk text-white hover:bg-acc-deep hover:text-white",
  outline: "bg-white text-ever-dk shadow-card hover:bg-ever-lt hover:text-ever-dk",
  tint: "bg-ever-lt text-ever-dk hover:bg-[#e3e9d8] hover:text-ever-dk",
  white: "bg-white text-ever-dk hover:bg-ever-lt hover:text-ever-dk",
  ghost: "bg-transparent text-ever-dk hover:bg-white/10 hover:text-white",
  underline: "px-0 py-3 text-sm font-bold text-ever-dk hover:text-ever",
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
    "inline-flex items-center justify-center rounded-full font-bold whitespace-nowrap transition-[scale,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
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

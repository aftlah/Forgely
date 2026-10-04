import type { ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

export type ButtonVariant = "bone" | "ghost" | "ember";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full border border-transparent font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ember";

const VARIANTS: Record<ButtonVariant, string> = {
  bone: "bg-bone text-ink hover:bg-white",
  ghost: "bg-surface-raised text-fg border-line hover:border-line-strong",
  ember: "bg-ember text-ink hover:bg-ember-400",
};

const SIZES: Record<ButtonSize, string> = {
  md: "px-6 py-3.5 text-[15px] leading-none",
  sm: "px-[18px] py-2.5 text-sm leading-none",
};

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Class names for the pill button. Exported so links (`next/link`) can look like buttons
 * without a wrapper component: `<Link className={buttonClasses({ variant: "bone" })}>`.
 */
export function buttonClasses({
  variant = "bone",
  size = "md",
  className,
}: ButtonStyle = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonStyle & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

import { cn } from "./cn";

interface LogoProps {
  size?: number;
  className?: string;
}

/** The Forgely mark: an F whose lower arm is the ember. See `brand/README.md` for usage rules. */
export function LogoMark({ size = 26, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect
        width="64"
        height="64"
        rx="14"
        fill="var(--color-ink)"
        stroke="var(--color-line-strong)"
        strokeWidth="2"
      />
      <path fill="var(--color-fg)" d="M18 12H48V21H27V28H38V36H27V52H18Z" />
      <rect x="41" y="28" width="9" height="8" fill="var(--color-ember)" />
    </svg>
  );
}

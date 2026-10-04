import type { HTMLAttributes } from "react";

import { cn } from "./cn";

/** A bordered panel that frames real product UI (plan preview, dashboard). */
export function Window({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-line bg-surface-raised", className)}
      {...props}
    />
  );
}

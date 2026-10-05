import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@forgely/ui";

interface SettingsCardProps {
  title: string;
  icon: LucideIcon;
  /** Sits at the right of the header: a channel picker or an on/off switch. */
  action?: ReactNode;
  /** One line under the header that says what this card does. */
  description?: string;
  className?: string;
  children: ReactNode;
}

/** One group of related settings. The header carries the card's own control, so it reads as a unit. */
export function SettingsCard({
  title,
  icon: Icon,
  action,
  description,
  className,
  children,
}: SettingsCardProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex min-w-0 flex-col rounded-[22px] border border-line bg-surface-raised",
        className,
      )}
    >
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
          <Icon className="size-[18px] text-muted" aria-hidden="true" />
          {title}
        </h2>
        {action}
      </header>
      <div className="grid flex-1 content-start gap-4 p-5">
        {description && <p className="text-sm text-muted">{description}</p>}
        {children}
      </div>
    </section>
  );
}

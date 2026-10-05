import { Plus } from "lucide-react";

import type { RolePanel } from "@forgely/shared";
import { cn } from "@forgely/ui";

import type { ChannelOption } from "@/features/settings/guild-resources";

const TILE =
  "flex min-h-32 min-w-0 flex-col justify-between gap-3 rounded-[14px] border p-4 text-left transition-colors";

const MODE_LABELS: Record<RolePanel["mode"], string> = {
  toggle: "Each button toggles its role",
  unique: "One role at a time",
};

function describePosting(panel: RolePanel, channels: ChannelOption[] | null): string {
  if (!panel.message) return "Not posted yet";
  const name = channels?.find((channel) => channel.id === panel.message?.channelId)?.name;
  return name ? `Posted in #${name}` : "Posted";
}

interface PanelTileProps {
  panel: RolePanel;
  channels: ChannelOption[] | null;
  onOpen: () => void;
}

/** One panel in the grid. Clicking it opens it in the editor dialog. */
export function PanelTile({ panel, channels, onOpen }: PanelTileProps) {
  const buttonCount = panel.buttons.length;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={cn(
          TILE,
          "w-full cursor-pointer border-line bg-surface-inset hover:border-ember",
        )}
      >
        <span className="grid gap-1">
          <span className="truncate font-semibold">{panel.title || "Untitled panel"}</span>
          <span className="text-sm text-muted">{describePosting(panel, channels)}</span>
        </span>
        <span className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
          {buttonCount} button{buttonCount === 1 ? "" : "s"} · {MODE_LABELS[panel.mode]}
        </span>
      </button>
    </li>
  );
}

/** The dashed tile that adds a panel. It says so plainly when the limit is reached. */
export function NewPanelTile({
  isDisabled,
  max,
  onAdd,
}: {
  isDisabled: boolean;
  max: number;
  onAdd: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onAdd}
        disabled={isDisabled}
        className={cn(
          TILE,
          "w-full cursor-pointer items-center justify-center border-dashed border-line-strong text-muted hover:border-ember hover:text-fg disabled:cursor-default disabled:opacity-50 disabled:hover:border-line-strong disabled:hover:text-muted",
        )}
      >
        <span className="grid size-9 place-items-center rounded-full border border-line-strong">
          <Plus className="size-4" aria-hidden="true" />
        </span>
        <span className="text-sm">
          {isDisabled ? `Limit of ${max} panels reached` : "New panel"}
        </span>
      </button>
    </li>
  );
}

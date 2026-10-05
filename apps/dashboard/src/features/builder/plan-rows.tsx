"use client";

import { Hash, Lock, Megaphone, MessagesSquare, Volume2, type LucideIcon } from "lucide-react";

import type { ChannelKind, DiffStatus, PlanChannel } from "@forgely/ai";

const KIND_ICONS: Record<ChannelKind, LucideIcon> = {
  text: Hash,
  announcement: Megaphone,
  voice: Volume2,
  forum: MessagesSquare,
};

const KIND_LABELS: Record<ChannelKind, string> = {
  text: "text channel",
  announcement: "announcement channel",
  voice: "voice channel",
  forum: "forum channel",
};

interface RowShellProps {
  id: string;
  label: string;
  status: DiffStatus;
  isChecked: boolean;
  isLocked: boolean;
  onToggle: () => void;
  /** Extra left padding, for items inside a category. */
  isNested?: boolean;
  children: React.ReactNode;
}

/** One line of the plan: a checkbox for new things, a plain "exists" for what is already there. */
export function RowShell({
  id,
  label,
  status,
  isChecked,
  isLocked,
  onToggle,
  isNested,
  children,
}: RowShellProps) {
  const isExisting = status === "exists";
  return (
    <li className={`flex items-center gap-3 py-1.5 ${isNested ? "pl-6" : ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={!isExisting && isChecked}
        disabled={isExisting || isLocked}
        onChange={onToggle}
        aria-label={isExisting ? `${label} (already exists)` : `Create ${label}`}
        className="size-4 shrink-0 accent-ember"
      />
      <span
        className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-2 ${isExisting ? "text-muted" : ""}`}
      >
        {children}
      </span>
      <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
        {isExisting ? "exists" : "new"}
      </span>
    </li>
  );
}

function accessNote(channel: PlanChannel, roleName: (key: string) => string): string | null {
  if (channel.access === "read-only") return "read-only";
  if (channel.access === "private")
    return `private: ${channel.allowedRoleKeys.map(roleName).join(", ")}`;
  return null;
}

export function ChannelLabel({
  channel,
  roleName,
}: {
  channel: PlanChannel;
  roleName: (key: string) => string;
}) {
  const Icon = KIND_ICONS[channel.kind];
  const note = accessNote(channel, roleName);
  return (
    <>
      <Icon className="size-4 shrink-0" aria-label={KIND_LABELS[channel.kind]} role="img" />
      <span className="break-all">{channel.name}</span>
      {note && (
        <span className="inline-flex items-center gap-1 text-sm text-muted">
          {channel.access === "private" && <Lock className="size-3" aria-hidden="true" />}
          {note}
        </span>
      )}
    </>
  );
}

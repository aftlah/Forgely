"use client";

import { useState } from "react";

import type { RolePanel, RolePanelsConfig } from "@forgely/shared";
import { Button } from "@forgely/ui";

import { publishRolePanelAction } from "./actions";

import type { ChannelOption } from "@/features/settings/guild-resources";

interface PanelPublishBarProps {
  guildId: string;
  panel: RolePanel;
  channels: ChannelOption[] | null;
  /** True while there are unsaved edits. Posting works from what is saved, so it must wait. */
  isDirty: boolean;
  onPublished: (config: RolePanelsConfig) => void;
}

function findBlocker(panel: RolePanel, isDirty: boolean): string | null {
  if (isDirty) return "Save your changes first. Posting uses what is saved.";
  if (!panel.channelId) return "Pick a channel to post in.";
  if (panel.buttons.length === 0) return "Add at least one button.";
  return null;
}

/** Says where the panel is posted, and posts or updates it. Works from the saved panel only. */
export function PanelPublishBar({
  guildId,
  panel,
  channels,
  isDirty,
  onPublished,
}: PanelPublishBarProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const channelName = (id: string): string =>
    channels?.find((channel) => channel.id === id)?.name ?? "a channel";
  const blocker = findBlocker(panel, isDirty);
  const postLabel = panel.message ? "Update message" : "Post to channel";

  async function post(): Promise<void> {
    setIsPosting(true);
    setFeedback(null);
    try {
      const result = await publishRolePanelAction(guildId, panel.id);
      if (result.ok) {
        onPublished(result.config);
        setFeedback({
          ok: true,
          text: result.posted === "created" ? "Posted." : "Message updated.",
        });
      } else {
        setFeedback({ ok: false, text: result.message });
      }
    } catch {
      setFeedback({ ok: false, text: "Couldn't reach the server. Nothing was posted. Try again." });
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="grid gap-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="bone"
          size="sm"
          onClick={() => void post()}
          disabled={isPosting || blocker !== null}
        >
          {isPosting ? "Posting…" : postLabel}
        </Button>
        <span className="text-sm text-muted">
          {panel.message ? `Posted in #${channelName(panel.message.channelId)}` : "Not posted yet"}
        </span>
      </div>
      {blocker && <p className="text-sm text-muted">{blocker}</p>}
      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={feedback.ok ? "text-sm text-success" : "text-sm text-danger"}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

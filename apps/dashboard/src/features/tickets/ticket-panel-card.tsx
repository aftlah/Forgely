"use client";

import { Megaphone } from "lucide-react";
import { useState } from "react";

import type { TicketsConfig } from "@forgely/shared";
import { Button } from "@forgely/ui";

import { ChannelSelect, SettingsCard } from "@/features/settings/fields";
import { CONTROL, FIELD_LABEL } from "@/features/settings/fields/field-style";
import type { ChannelOption } from "@/features/settings/guild-resources";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_BUTTON_LABEL_LENGTH = 80;

type Panel = TicketsConfig["panel"];

/** Why the panel cannot be posted yet, or null when it can. */
function findBlocker(panel: Panel, hasCategory: boolean): string | null {
  if (!panel.channelId) return "Pick a channel to post the panel in.";
  if (!hasCategory)
    return "Choose a category for new tickets first. Without one the button can't open anything.";
  return null;
}

/** A close picture of the message in Discord. Its colors are Discord's own, on purpose. */
function PanelPreview({ panel }: { panel: Panel }) {
  return (
    <div className="rounded-md border border-line bg-surface-inset p-4">
      <div className="border-l-4 border-ember pl-3">
        <p className="font-semibold break-words">{panel.title || "Untitled panel"}</p>
        {panel.description && (
          <p className="mt-1 text-[15px] break-words whitespace-pre-wrap text-muted">
            {panel.description}
          </p>
        )}
      </div>
      <span className="mt-3 inline-block rounded-[3px] bg-[#5865f2] px-4 py-1.5 text-sm font-medium text-white">
        {panel.buttonLabel || "Button"}
      </span>
    </div>
  );
}

interface PostControlsProps {
  panel: Panel;
  /** Name of the channel the panel is posted in, if known. */
  postedIn: string | undefined;
  blocker: string | null;
  isPosting: boolean;
  feedback: { ok: boolean; text: string } | null;
  onPost: () => void;
}

function describePostButton(panel: Panel, isPosting: boolean): string {
  if (isPosting) return "Posting…";
  return panel.message ? "Save and update message" : "Save and post panel";
}

/** The post button, where the panel currently is, and the outcome of the last attempt. */
function PostControls({
  panel,
  postedIn,
  blocker,
  isPosting,
  feedback,
  onPost,
}: PostControlsProps) {
  return (
    <div className="grid gap-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="bone" size="sm" onClick={onPost} disabled={isPosting || blocker !== null}>
          {describePostButton(panel, isPosting)}
        </Button>
        <span className="text-sm text-muted">
          {panel.message ? `Posted${postedIn ? ` in #${postedIn}` : ""}` : "Not posted yet"}
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

interface TicketPanelCardProps {
  panel: Panel;
  channels: ChannelOption[] | null;
  hasCategory: boolean;
  fieldError: (path: string) => string | undefined;
  onChange: (panel: Panel) => void;
  /** Saves, then posts. Resolves to a message when something failed, or null when all went well. */
  onPost: () => Promise<string | null>;
}

/** The message people press to open a ticket: its text, a preview, and the button that posts it. */
export function TicketPanelCard({
  panel,
  channels,
  hasCategory,
  fieldError,
  onChange,
  onPost,
}: TicketPanelCardProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<Panel>): void => onChange({ ...panel, ...patch });
  const blocker = findBlocker(panel, hasCategory);
  const postedIn = channels?.find((channel) => channel.id === panel.message?.channelId)?.name;

  async function post(): Promise<void> {
    setIsPosting(true);
    setFeedback(null);
    const message = await onPost();
    setFeedback(
      message ? { ok: false, text: message } : { ok: true, text: "Done. The panel is live." },
    );
    setIsPosting(false);
  }

  return (
    <SettingsCard
      title="Ticket panel"
      icon={Megaphone}
      description="The message members press to open a ticket. Posting saves your changes first."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-5">
          <ChannelSelect
            id="ticket-panel-channel"
            label="Post in"
            value={panel.channelId}
            channels={channels}
            onChange={(channelId) => set({ channelId })}
            error={fieldError("panel.channelId")}
          />
          <div>
            <label htmlFor="ticket-panel-title" className={FIELD_LABEL}>
              Title
            </label>
            <input
              id="ticket-panel-title"
              type="text"
              value={panel.title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => set({ title: event.target.value })}
              className={CONTROL}
            />
            {fieldError("panel.title") && (
              <p role="alert" className="mt-1 text-sm text-danger">
                {fieldError("panel.title")}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ticket-panel-description" className={FIELD_LABEL}>
              Description
            </label>
            <textarea
              id="ticket-panel-description"
              rows={3}
              value={panel.description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              onChange={(event) => set({ description: event.target.value })}
              className={CONTROL}
            />
          </div>
          <div>
            <label htmlFor="ticket-panel-button" className={FIELD_LABEL}>
              Button label
            </label>
            <input
              id="ticket-panel-button"
              type="text"
              value={panel.buttonLabel}
              maxLength={MAX_BUTTON_LABEL_LENGTH}
              onChange={(event) => set({ buttonLabel: event.target.value })}
              className={CONTROL}
            />
            {fieldError("panel.buttonLabel") && (
              <p role="alert" className="mt-1 text-sm text-danger">
                {fieldError("panel.buttonLabel")}
              </p>
            )}
          </div>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <p className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Preview</p>
          <PanelPreview panel={panel} />
          <PostControls
            panel={panel}
            postedIn={postedIn}
            blocker={blocker}
            isPosting={isPosting}
            feedback={feedback}
            onPost={() => void post()}
          />
        </div>
      </div>
    </SettingsCard>
  );
}

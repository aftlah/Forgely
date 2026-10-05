import { Fragment, type ReactNode } from "react";

import { LogoMark } from "@forgely/ui";

const MENTION = /(@[\p{L}\p{N}_]+)/gu;

/** Wraps `@name` in a pill like Discord's mention highlight. The text is never treated as markup. */
function renderMentions(text: string): ReactNode[] {
  return text.split(MENTION).map((part, index) =>
    part.startsWith("@") ? (
      <span key={index} className="rounded-sm bg-surface-overlay px-1 text-fg">
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

interface DiscordMessagePreviewProps {
  /** Where it would appear: a channel like "#welcome", or "Direct message". */
  where: string;
  /** False when nothing would be sent, for example no channel is chosen. */
  isSent: boolean;
  /** The message after the sample values were filled in. */
  text: string;
}

/** A rough picture of how the bot's message looks in Discord, so a template can be judged before saving. */
export function DiscordMessagePreview({ where, isSent, text }: DiscordMessagePreviewProps) {
  return (
    <div className="rounded-md border border-line bg-surface-inset p-4">
      <p className="mb-3 font-mono text-xs text-muted">{where}</p>
      <div className={`flex gap-3 ${isSent ? "" : "opacity-50"}`}>
        <LogoMark size={36} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <strong>Forgely</strong>
            <span className="rounded-sm bg-ember px-1 font-mono text-[10px] font-medium text-ink">
              APP
            </span>
          </p>
          <p className="mt-0.5 text-[15px] break-words whitespace-pre-wrap">
            {text ? renderMentions(text) : <span className="text-muted">Nothing to show yet.</span>}
          </p>
        </div>
      </div>
      {!isSent && <p className="mt-3 text-sm text-muted">Not sent until a channel is chosen.</p>}
    </div>
  );
}

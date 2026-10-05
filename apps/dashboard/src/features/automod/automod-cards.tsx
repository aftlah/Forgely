"use client";

import { Ban, BellRing, MessageSquareWarning, UserCheck } from "lucide-react";
import { useState } from "react";

import {
  MAX_BLOCKED_WORDS,
  MAX_EXEMPT_ROLES,
  MAX_MENTION_LIMIT,
  MIN_MENTION_LIMIT,
  TIMEOUT_CHOICES,
  type AutomodConfig,
} from "@forgely/shared";
import { Checkbox, Select, Switch } from "@forgely/ui";

import { ChannelSelect, RoleChecklist, SettingsCard, ToggleRow } from "@/features/settings/fields";
import { CONTROL } from "@/features/settings/fields/field-style";
import { NumberInput } from "@/features/settings/fields/number-input";
import type { ChannelOption, RoleOption } from "@/features/settings/guild-resources";

type Patch = (patch: Partial<AutomodConfig>) => void;

const TIMEOUT_LABELS: Record<(typeof TIMEOUT_CHOICES)[number], string> = {
  60: "1 minute",
  300: "5 minutes",
  600: "10 minutes",
  3_600: "1 hour",
  86_400: "1 day",
};

/** One word or phrase per line, trimmed, with blanks and repeats dropped. */
export function parseWords(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      const key = line.toLowerCase();
      if (line === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

interface WordsCardProps {
  words: string[];
  error: string | undefined;
  onChange: (words: string[]) => void;
}

/** The text box keeps what is typed (including a half-written line); the saved list is the parsed result. */
export function WordsCard({ words, error, onChange }: WordsCardProps) {
  const [text, setText] = useState(words.join("\n"));
  // Discarding or saving changes the list from outside, so take the new list when it no longer matches the box.
  if (parseWords(text).join("\n") !== words.join("\n")) setText(words.join("\n"));

  return (
    <SettingsCard
      title="Blocked words"
      icon={Ban}
      description="Messages containing any of these are blocked. Matching ignores capital letters, and * works as a wildcard (for example bad*)."
      action={
        <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">
          {words.length} / {MAX_BLOCKED_WORDS}
        </span>
      }
    >
      <label htmlFor="automod-words" className="sr-only">
        Blocked words, one per line
      </label>
      <textarea
        id="automod-words"
        rows={8}
        value={text}
        spellCheck={false}
        placeholder={"One word or phrase per line"}
        onChange={(event) => {
          setText(event.target.value);
          onChange(parseWords(event.target.value));
        }}
        className={`${CONTROL} resize-y font-mono leading-[1.6]`}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </SettingsCard>
  );
}

const PRESET_LABELS = [
  { key: "profanity", label: "Profanity", note: "Common swear words" },
  { key: "sexualContent", label: "Sexual content", note: "Sexually explicit words" },
  { key: "slurs", label: "Slurs", note: "Hateful language" },
] as const;

export function ProtectionCard({ config, onChange }: { config: AutomodConfig; onChange: Patch }) {
  return (
    <SettingsCard title="Protection" icon={MessageSquareWarning}>
      <ToggleRow
        title="Block spam"
        description="Messages Discord thinks are spam."
        checked={config.blockSpam}
        onChange={(blockSpam) => onChange({ blockSpam })}
      />
      <ToggleRow
        title="Block invite links"
        description="Links to other Discord servers."
        checked={config.blockInvites}
        onChange={(blockInvites) => onChange({ blockInvites })}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[15px] font-semibold">Language filter</legend>
        {PRESET_LABELS.map((preset) => (
          <label key={preset.key} className="flex cursor-pointer items-center gap-3 text-[15px]">
            <Checkbox
              checked={config.presets[preset.key]}
              onChange={(event) =>
                onChange({ presets: { ...config.presets, [preset.key]: event.target.checked } })
              }
            />
            <span>{preset.label}</span>
            <span className="text-sm text-muted">{preset.note}</span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold">Mention limit</p>
            <p className="text-sm text-muted">Block messages that mention too many people.</p>
          </div>
          <Switch
            label="Mention limit"
            checked={config.mentionLimit !== null}
            onCheckedChange={(isOn) => onChange({ mentionLimit: isOn ? 10 : null })}
          />
        </div>
        {config.mentionLimit !== null && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Block more than</span>
            <NumberInput
              id="automod-mention-limit"
              value={config.mentionLimit}
              min={MIN_MENTION_LIMIT}
              max={MAX_MENTION_LIMIT}
              onChange={(mentionLimit) => onChange({ mentionLimit })}
              aria-label="Mention limit"
            />
            <span>mentions</span>
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

interface ResponseCardProps {
  config: AutomodConfig;
  channels: ChannelOption[] | null;
  error: string | undefined;
  onChange: Patch;
}

export function ResponseCard({ config, channels, error, onChange }: ResponseCardProps) {
  return (
    <SettingsCard
      title="When a message is blocked"
      icon={BellRing}
      description="Discord always blocks the message. You can also get a note about it, and time the member out."
    >
      <ChannelSelect
        id="automod-alert"
        label="Post a note in"
        hint="Discord posts who said what here. Pick None for no note."
        value={config.alertChannelId}
        channels={channels}
        onChange={(alertChannelId) => onChange({ alertChannelId })}
        error={error}
      />
      <div>
        <label htmlFor="automod-timeout" className="mb-2 block text-[15px] font-semibold">
          Time the member out
        </label>
        <Select
          id="automod-timeout"
          value={config.timeoutSeconds === null ? null : String(config.timeoutSeconds)}
          onChange={(value) => onChange({ timeoutSeconds: value === null ? null : Number(value) })}
          clearLabel="No timeout"
          placeholder="No timeout"
          options={TIMEOUT_CHOICES.map((seconds) => ({
            value: String(seconds),
            label: TIMEOUT_LABELS[seconds],
          }))}
          className="max-w-64"
        />
        <p className="mt-2 text-sm text-muted">
          Applies to blocked words, invite links, and the mention limit. Discord doesn&apos;t allow
          it on spam.
        </p>
      </div>
    </SettingsCard>
  );
}

interface ExemptCardProps {
  roles: RoleOption[] | null;
  selected: string[];
  error: string | undefined;
  onChange: (roleIds: string[]) => void;
}

export function ExemptCard({ roles, selected, error, onChange }: ExemptCardProps) {
  return (
    <SettingsCard title="Exempt roles" icon={UserCheck}>
      <RoleChecklist
        legend="Roles AutoMod ignores"
        hint={`For example your moderators. Up to ${MAX_EXEMPT_ROLES}.`}
        roles={roles}
        selected={selected}
        max={MAX_EXEMPT_ROLES}
        needsAssignable={false}
        onChange={onChange}
        error={error}
      />
    </SettingsCard>
  );
}

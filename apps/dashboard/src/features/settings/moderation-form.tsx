"use client";

import { Mail, ScrollText, Terminal } from "lucide-react";

import type { ModerationConfig } from "@forgely/shared";
import { Switch } from "@forgely/ui";

import { saveModuleSettingsAction } from "./actions";
import { ChannelSelect, SettingsCard } from "./fields";
import type { ChannelOption } from "./guild-resources";
import { SaveBar } from "./save-bar";
import { useSettingsForm } from "./use-settings-form";

interface ModerationFormProps {
  guildId: string;
  initial: { isEnabled: boolean; config: ModerationConfig };
  channels: ChannelOption[] | null;
}

const COMMANDS = [
  { name: "/ban", does: "Ban a member and record the case." },
  { name: "/kick", does: "Remove a member. They can rejoin with an invite." },
  { name: "/timeout", does: "Mute a member for a set time." },
  { name: "/warn", does: "Record a warning for a member." },
  { name: "/warnings", does: "Show the warnings a member has." },
  { name: "/purge", does: "Delete recent messages in bulk." },
];

function CommandsCard() {
  return (
    <SettingsCard
      title="Commands"
      icon={Terminal}
      description="These slash commands are available to moderators while this module is on."
    >
      <ul className="m-0 grid list-none gap-x-6 gap-y-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {COMMANDS.map((command) => (
          <li key={command.name} className="grid gap-0.5">
            <code className="font-mono text-sm">{command.name}</code>
            <span className="text-sm text-muted">{command.does}</span>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

export function ModerationSettingsForm({ guildId, initial, channels }: ModerationFormProps) {
  const form = useSettingsForm(initial, (value) =>
    saveModuleSettingsAction(guildId, "moderation", value.isEnabled, value.config),
  );
  const { draft } = form;
  const setConfig = (patch: Partial<ModerationConfig>): void =>
    form.update({ config: { ...draft.config, ...patch } });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isDirty) void form.save();
      }}
      className="mx-auto grid max-w-[1120px] gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="display flex items-center gap-2.5 text-[22px]">
            <ScrollText className="size-5 text-muted" aria-hidden="true" />
            Moderation
          </h2>
          <p className="mt-1 text-sm text-muted">
            Moderation commands with a stored case history. This switch turns all of them on or off
            for this server.
          </p>
        </div>
        <Switch
          label="Moderation module"
          checked={draft.isEnabled}
          onCheckedChange={(isEnabled) => form.update({ isEnabled })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SettingsCard
          title="Mod log"
          icon={ScrollText}
          description="Every action is posted in this channel. Pick None to keep cases in the database only."
        >
          <ChannelSelect
            id="mod-log-channel"
            label="Mod-log channel"
            value={draft.config.modLogChannelId}
            channels={channels}
            onChange={(modLogChannelId) => setConfig({ modLogChannelId })}
            error={form.fieldError("modLogChannelId")}
          />
        </SettingsCard>

        <SettingsCard
          title="Message members"
          icon={Mail}
          description="Send a DM before a ban or kick, and after a timeout or warning."
          action={
            <Switch
              label="Message members about actions"
              checked={draft.config.notifyUserByDm}
              onCheckedChange={(notifyUserByDm) => setConfig({ notifyUserByDm })}
            />
          }
        >
          <p className="text-sm text-muted">
            Members with closed DMs are skipped without any error.
          </p>
        </SettingsCard>
      </div>

      <CommandsCard />

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />
    </form>
  );
}

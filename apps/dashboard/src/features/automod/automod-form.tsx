"use client";

import { ShieldAlert } from "lucide-react";

import type { AutomodConfig } from "@forgely/shared";
import { Switch } from "@forgely/ui";

import { syncAutomodAction } from "./actions";
import { ExemptCard, ProtectionCard, ResponseCard, WordsCard } from "./automod-cards";

import { saveModuleSettingsAction } from "@/features/settings/actions";
import type { ChannelOption, RoleOption } from "@/features/settings/guild-resources";
import { SaveBar } from "@/features/settings/save-bar";
import { useSettingsForm } from "@/features/settings/use-settings-form";

interface AutomodFormProps {
  guildId: string;
  initial: { isEnabled: boolean; config: AutomodConfig };
  channels: ChannelOption[] | null;
  roles: RoleOption[] | null;
}

export function AutomodSettingsForm({ guildId, initial, channels, roles }: AutomodFormProps) {
  const form = useSettingsForm(initial, async (value) => {
    const saved = await saveModuleSettingsAction(guildId, "automod", value.isEnabled, value.config);
    if (!saved.ok) return saved;
    // The rules live in Discord, so saving is only done once Discord has them.
    const synced = await syncAutomodAction(guildId);
    if (synced.ok) return saved;
    return {
      ok: false as const,
      // The settings themselves were fine; Discord was the part that refused.
      reason: "unverifiable" as const,
      message: `Your settings were saved, but Discord's AutoMod wasn't updated. ${synced.message}`,
      fieldErrors: {},
    };
  });
  const { config } = form.draft;
  const setConfig = (patch: Partial<AutomodConfig>): void =>
    form.update({ config: { ...config, ...patch } });

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
            <ShieldAlert className="size-5 text-muted" aria-hidden="true" />
            Automod
          </h2>
          <p className="mt-1 max-w-[62ch] text-sm text-muted">
            Forgely sets up Discord&apos;s own AutoMod for you. Discord does the checking, so it
            works even when the bot is offline. This switch turns all of it on or off.
          </p>
        </div>
        <Switch
          label="Automod module"
          checked={form.draft.isEnabled}
          onCheckedChange={(isEnabled) => form.update({ isEnabled })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <WordsCard
          words={config.blockedWords}
          error={form.fieldError("blockedWords")}
          onChange={(blockedWords) => setConfig({ blockedWords })}
        />
        <ProtectionCard config={config} onChange={setConfig} />
        <ResponseCard
          config={config}
          channels={channels}
          error={form.fieldError("alertChannelId")}
          onChange={setConfig}
        />
        <ExemptCard
          roles={roles}
          selected={config.exemptRoleIds}
          error={form.fieldError("exemptRoleIds")}
          onChange={(exemptRoleIds) => setConfig({ exemptRoleIds })}
        />
      </div>

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
        savedText="Saved. Discord's AutoMod now matches these settings."
      />
    </form>
  );
}

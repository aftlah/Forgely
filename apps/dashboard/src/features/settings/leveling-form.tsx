"use client";

import { Gift, Megaphone, Star, Zap } from "lucide-react";

import {
  LEVELING_TEMPLATE_VARIABLES,
  MAX_ROLE_REWARDS,
  type LevelingConfig,
} from "@forgely/shared";
import { Switch } from "@forgely/ui";

import { saveModuleSettingsAction } from "./actions";
import { ChannelSelect, MessageField, NumberField, RadioGroup, SettingsCard } from "./fields";
import type { ChannelOption, RoleOption } from "./guild-resources";
import { RoleRewardsEditor } from "./role-rewards-editor";
import { SaveBar } from "./save-bar";
import { useSettingsForm } from "./use-settings-form";

const MODE_OPTIONS = [
  { value: "same-channel", label: "In the channel where they were chatting" },
  { value: "channel", label: "In one specific channel" },
  { value: "off", label: "Don't announce level-ups" },
] as const;

interface LevelingFormProps {
  guildId: string;
  serverName: string;
  initial: { isEnabled: boolean; config: LevelingConfig };
  channels: ChannelOption[] | null;
  roles: RoleOption[] | null;
}

/** Where a level-up message would appear, in the words the preview shows. */
function describeLevelUpDestination(
  config: LevelingConfig["levelUp"],
  channels: ChannelOption[] | null,
): { where: string; isSent: boolean } {
  if (config.mode === "same-channel") {
    return { where: "The channel they were chatting in", isSent: true };
  }
  const name = channels?.find((channel) => channel.id === config.channelId)?.name;
  if (!config.channelId) return { where: "No channel selected", isSent: false };
  return { where: name ? `#${name}` : "#unknown-channel", isSent: true };
}

interface XpCardProps {
  xp: LevelingConfig["xp"];
  onChange: (patch: Partial<LevelingConfig["xp"]>) => void;
  fieldError: (path: string) => string | undefined;
}

function XpCard({ xp, onChange, fieldError }: XpCardProps) {
  return (
    <SettingsCard
      title="XP"
      icon={Zap}
      description="Each message earns a random amount between the minimum and maximum, at most once per cooldown. A cooldown stops spamming from levelling anyone up."
    >
      <NumberField
        id="xp-min"
        label="Minimum per message"
        min={1}
        max={100}
        value={xp.min}
        onChange={(min) => onChange({ min })}
        error={fieldError("xp.min")}
      />
      <NumberField
        id="xp-max"
        label="Maximum per message"
        min={1}
        max={100}
        value={xp.max}
        onChange={(max) => onChange({ max })}
        error={fieldError("xp.max")}
      />
      <NumberField
        id="xp-cooldown"
        label="Cooldown"
        unit="seconds"
        min={0}
        max={3600}
        value={xp.cooldownSeconds}
        onChange={(cooldownSeconds) => onChange({ cooldownSeconds })}
        error={fieldError("xp.cooldownSeconds")}
      />
    </SettingsCard>
  );
}

export function LevelingSettingsForm({
  guildId,
  serverName,
  initial,
  channels,
  roles,
}: LevelingFormProps) {
  const form = useSettingsForm(initial, (value) =>
    saveModuleSettingsAction(guildId, "leveling", value.isEnabled, value.config),
  );
  const { config } = form.draft;
  const setConfig = (patch: Partial<LevelingConfig>): void =>
    form.update({ config: { ...config, ...patch } });
  const setLevelUp = (patch: Partial<LevelingConfig["levelUp"]>): void =>
    setConfig({ levelUp: { ...config.levelUp, ...patch } });
  const sampleValues = { user: "@Ada", username: "Ada", level: "7", server: serverName };

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
            <Star className="size-5 text-muted" aria-hidden="true" />
            Leveling
          </h2>
          <p className="mt-1 text-sm text-muted">
            Members earn XP for chatting. This switch turns XP, level-ups, role rewards, /rank, and
            /leaderboard on or off.
          </p>
        </div>
        <Switch
          label="Leveling module"
          checked={form.draft.isEnabled}
          onCheckedChange={(isEnabled) => form.update({ isEnabled })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SettingsCard title="Level-up message" icon={Megaphone}>
          <RadioGroup
            legend="Where to announce"
            name="level-up-mode"
            options={[...MODE_OPTIONS]}
            value={config.levelUp.mode}
            onChange={(mode) => setLevelUp({ mode })}
          />
          {config.levelUp.mode === "channel" && (
            <ChannelSelect
              id="level-up-channel"
              label="Channel"
              value={config.levelUp.channelId}
              channels={channels}
              onChange={(channelId) => setLevelUp({ channelId })}
              error={form.fieldError("levelUp.channelId")}
            />
          )}
          {config.levelUp.mode !== "off" && (
            <MessageField
              id="level-up-message"
              label="Message"
              layout="card"
              value={config.levelUp.message}
              variables={LEVELING_TEMPLATE_VARIABLES}
              sampleValues={sampleValues}
              onChange={(message) => setLevelUp({ message })}
              error={form.fieldError("levelUp.message")}
              previewAs={describeLevelUpDestination(config.levelUp, channels)}
            />
          )}
        </SettingsCard>

        <XpCard
          xp={config.xp}
          onChange={(patch) => setConfig({ xp: { ...config.xp, ...patch } })}
          fieldError={form.fieldError}
        />
      </div>

      <SettingsCard
        title="Role rewards"
        icon={Gift}
        description="Give a role when a member reaches a level. They keep every reward at or below their level."
        action={
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">
            {config.roleRewards.length} / {MAX_ROLE_REWARDS}
          </span>
        }
      >
        <RoleRewardsEditor
          rewards={config.roleRewards}
          roles={roles}
          onChange={(roleRewards) => setConfig({ roleRewards })}
          fieldError={form.fieldError}
        />
      </SettingsCard>

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />
    </form>
  );
}

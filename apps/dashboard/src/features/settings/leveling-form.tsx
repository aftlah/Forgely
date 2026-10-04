"use client";

import type { ReactNode } from "react";

import { LEVELING_TEMPLATE_VARIABLES, type LevelingConfig } from "@forgely/shared";

import { saveModuleSettingsAction } from "./actions";
import { ChannelSelect, MessageField, NumberField, RadioGroup, ToggleRow } from "./fields";
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line pt-8">
      <h2 className="display text-[22px]">{title}</h2>
      {children}
    </section>
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
  const setXp = (patch: Partial<LevelingConfig["xp"]>): void =>
    setConfig({ xp: { ...config.xp, ...patch } });
  const setLevelUp = (patch: Partial<LevelingConfig["levelUp"]>): void =>
    setConfig({ levelUp: { ...config.levelUp, ...patch } });
  const sampleValues = { user: "@Ada", username: "Ada", level: "7", server: serverName };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isDirty) void form.save();
      }}
      className="grid max-w-[720px] gap-8"
    >
      <ToggleRow
        title="Leveling"
        description="Members earn XP for chatting. Turns XP, level-ups, role rewards, /rank, and /leaderboard on or off."
        checked={form.draft.isEnabled}
        onChange={(isEnabled) => form.update({ isEnabled })}
      />

      <Section title="XP">
        <div className="flex flex-wrap gap-6">
          <NumberField
            id="xp-min"
            label="Minimum per message"
            min={1}
            max={100}
            value={config.xp.min}
            onChange={(min) => setXp({ min })}
            error={form.fieldError("xp.min")}
          />
          <NumberField
            id="xp-max"
            label="Maximum per message"
            min={1}
            max={100}
            value={config.xp.max}
            onChange={(max) => setXp({ max })}
            error={form.fieldError("xp.max")}
          />
          <NumberField
            id="xp-cooldown"
            label="Cooldown"
            unit="seconds"
            min={0}
            max={3600}
            value={config.xp.cooldownSeconds}
            onChange={(cooldownSeconds) => setXp({ cooldownSeconds })}
            error={form.fieldError("xp.cooldownSeconds")}
          />
        </div>
        <p className="text-sm text-muted">
          Each message earns a random amount between the minimum and maximum, at most once per
          cooldown. A cooldown stops spamming from levelling anyone up.
        </p>
      </Section>

      <Section title="Level-up message">
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
            value={config.levelUp.message}
            variables={LEVELING_TEMPLATE_VARIABLES}
            sampleValues={sampleValues}
            onChange={(message) => setLevelUp({ message })}
            error={form.fieldError("levelUp.message")}
          />
        )}
      </Section>

      <Section title="Role rewards">
        <p className="text-sm text-muted">
          Give a role when a member reaches a level. They keep every reward at or below their level.
        </p>
        <RoleRewardsEditor
          rewards={config.roleRewards}
          roles={roles}
          onChange={(roleRewards) => setConfig({ roleRewards })}
          fieldError={form.fieldError}
        />
      </Section>

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />
    </form>
  );
}

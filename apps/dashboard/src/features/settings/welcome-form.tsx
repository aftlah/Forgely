"use client";

import type { ReactNode } from "react";

import { WELCOME_TEMPLATE_VARIABLES, type WelcomeConfig } from "@forgely/shared";

import { saveModuleSettingsAction } from "./actions";
import { ChannelSelect, MessageField, RoleChecklist, ToggleRow } from "./fields";
import type { ChannelOption, RoleOption } from "./guild-resources";
import { SaveBar } from "./save-bar";
import { useSettingsForm } from "./use-settings-form";

const MAX_AUTO_ROLES = 10;

interface WelcomeFormProps {
  guildId: string;
  serverName: string;
  initial: { isEnabled: boolean; config: WelcomeConfig };
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

export function WelcomeSettingsForm({
  guildId,
  serverName,
  initial,
  channels,
  roles,
}: WelcomeFormProps) {
  const form = useSettingsForm(initial, (value) =>
    saveModuleSettingsAction(guildId, "welcome", value.isEnabled, value.config),
  );
  const { draft } = form;
  const sampleValues = {
    user: "@NewMember",
    username: "NewMember",
    server: serverName,
    memberCount: "128",
  };
  const { config } = draft;
  const setConfig = (patch: Partial<WelcomeConfig>): void =>
    form.update({ config: { ...config, ...patch } });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isDirty) void form.save();
      }}
      className="grid max-w-[720px] gap-8"
    >
      <ToggleRow
        title="Welcome"
        description="Turns welcome and goodbye messages, the welcome DM, and auto-roles on or off for this server."
        checked={draft.isEnabled}
        onChange={(isEnabled) => form.update({ isEnabled })}
      />

      <Section title="Welcome message">
        <ChannelSelect
          id="welcome-channel"
          label="Channel"
          hint="Where to greet new members. Pick None to send no welcome message."
          value={config.welcome.channelId}
          channels={channels}
          onChange={(channelId) => setConfig({ welcome: { ...config.welcome, channelId } })}
          error={form.fieldError("welcome.channelId")}
        />
        <MessageField
          id="welcome-message"
          label="Message"
          value={config.welcome.message}
          variables={WELCOME_TEMPLATE_VARIABLES}
          sampleValues={sampleValues}
          onChange={(message) => setConfig({ welcome: { ...config.welcome, message } })}
          error={form.fieldError("welcome.message")}
        />
      </Section>

      <Section title="Welcome DM">
        <ToggleRow
          title="Send a private message to new members"
          description="Members with closed DMs are skipped without any error."
          checked={config.dm.isEnabled}
          onChange={(isEnabled) => setConfig({ dm: { ...config.dm, isEnabled } })}
        />
        <MessageField
          id="dm-message"
          label="Message"
          value={config.dm.message}
          variables={WELCOME_TEMPLATE_VARIABLES}
          sampleValues={sampleValues}
          onChange={(message) => setConfig({ dm: { ...config.dm, message } })}
          error={form.fieldError("dm.message")}
        />
      </Section>

      <Section title="Auto-roles">
        <RoleChecklist
          legend="Give new members these roles"
          hint={`Up to ${MAX_AUTO_ROLES}. Forgely can only give roles that sit below its own role in Server Settings.`}
          roles={roles}
          selected={config.autoRoleIds}
          max={MAX_AUTO_ROLES}
          onChange={(autoRoleIds) => setConfig({ autoRoleIds })}
          error={form.fieldError("autoRoleIds")}
        />
      </Section>

      <Section title="Goodbye message">
        <ChannelSelect
          id="goodbye-channel"
          label="Channel"
          hint="Where to post when someone leaves. Pick None to send nothing."
          value={config.goodbye.channelId}
          channels={channels}
          onChange={(channelId) => setConfig({ goodbye: { ...config.goodbye, channelId } })}
          error={form.fieldError("goodbye.channelId")}
        />
        <MessageField
          id="goodbye-message"
          label="Message"
          value={config.goodbye.message}
          variables={WELCOME_TEMPLATE_VARIABLES}
          sampleValues={sampleValues}
          onChange={(message) => setConfig({ goodbye: { ...config.goodbye, message } })}
          error={form.fieldError("goodbye.message")}
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

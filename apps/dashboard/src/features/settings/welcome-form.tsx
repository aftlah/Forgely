"use client";

import { Mail, MessageSquare, UserCheck, UserMinus, type LucideIcon } from "lucide-react";

import { WELCOME_TEMPLATE_VARIABLES, type WelcomeConfig } from "@forgely/shared";
import { Switch } from "@forgely/ui";

import { saveModuleSettingsAction } from "./actions";
import { ChannelSelect, MessageField, RoleChecklist, SettingsCard } from "./fields";
import type { ChannelOption, RoleOption } from "./guild-resources";
import { SaveBar } from "./save-bar";
import { useSettingsForm } from "./use-settings-form";

const MAX_AUTO_ROLES = 10;
const CHANNEL_MESSAGE_ROWS = 4;
const DM_MESSAGE_ROWS = 6;

interface WelcomeFormProps {
  guildId: string;
  serverName: string;
  initial: { isEnabled: boolean; config: WelcomeConfig };
  channels: ChannelOption[] | null;
  roles: RoleOption[] | null;
}

type SampleValues = Record<string, string>;

/** Where a message would land, in the words the preview shows. */
function describeDestination(
  channels: ChannelOption[] | null,
  channelId: string | null,
): { where: string; isSent: boolean } {
  if (channelId === null) return { where: "No channel selected", isSent: false };
  const name = channels?.find((channel) => channel.id === channelId)?.name;
  return { where: name ? `#${name}` : "#unknown-channel", isSent: true };
}

interface ChannelMessageCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  value: { channelId: string | null; message: string };
  onChange: (value: { channelId: string | null; message: string }) => void;
  channels: ChannelOption[] | null;
  sampleValues: SampleValues;
  errors: { channel?: string; message?: string };
}

/** A message posted in a channel: the channel picker is in the header, the text and its preview below. */
function ChannelMessageCard(props: ChannelMessageCardProps) {
  const { id, value, onChange, channels, errors } = props;
  return (
    <SettingsCard
      title={props.title}
      icon={props.icon}
      description={props.description}
      action={
        <ChannelSelect
          id={`${id}-channel`}
          label={`${props.title} channel`}
          variant="inline"
          value={value.channelId}
          channels={channels}
          onChange={(channelId) => onChange({ ...value, channelId })}
          error={errors.channel}
        />
      }
    >
      <MessageField
        id={`${id}-message`}
        label="Message"
        layout="card"
        rows={CHANNEL_MESSAGE_ROWS}
        value={value.message}
        variables={WELCOME_TEMPLATE_VARIABLES}
        sampleValues={props.sampleValues}
        onChange={(message) => onChange({ ...value, message })}
        error={errors.message}
        previewAs={describeDestination(channels, value.channelId)}
      />
    </SettingsCard>
  );
}

interface WelcomeDmCardProps {
  dm: WelcomeConfig["dm"];
  sampleValues: SampleValues;
  error: string | undefined;
  onChange: (dm: WelcomeConfig["dm"]) => void;
}

/** The private welcome message: its own switch in the header, then the text and preview. */
function WelcomeDmCard({ dm, sampleValues, error, onChange }: WelcomeDmCardProps) {
  return (
    <SettingsCard
      title="Welcome DM"
      icon={Mail}
      description="A private message to each new member. Members with closed DMs are skipped without any error."
      action={
        <Switch
          label="Send a welcome DM"
          checked={dm.isEnabled}
          onCheckedChange={(isEnabled) => onChange({ ...dm, isEnabled })}
        />
      }
    >
      <MessageField
        id="dm-message"
        label="Message"
        layout="card"
        rows={DM_MESSAGE_ROWS}
        value={dm.message}
        variables={WELCOME_TEMPLATE_VARIABLES}
        sampleValues={sampleValues}
        onChange={(message) => onChange({ ...dm, message })}
        error={error}
        previewAs={{
          where: "Direct message",
          isSent: dm.isEnabled,
          unsentNote: "Not sent while this is switched off.",
        }}
      />
    </SettingsCard>
  );
}

/** The whole page: one module switch, then paired cards (welcome with DM, goodbye with auto-roles). */
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
  const { config } = draft;
  const sampleValues = {
    user: "@NewMember",
    username: "NewMember",
    server: serverName,
    memberCount: "128",
  };
  const setConfig = (patch: Partial<WelcomeConfig>): void =>
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
            <MessageSquare className="size-5 text-muted" aria-hidden="true" />
            Welcome
          </h2>
          <p className="mt-1 text-sm text-muted">
            Greet new members, say goodbye, and hand out roles. This switch turns all of it on or
            off for this server.
          </p>
        </div>
        <Switch
          label="Welcome module"
          checked={draft.isEnabled}
          onCheckedChange={(isEnabled) => form.update({ isEnabled })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChannelMessageCard
          id="welcome"
          title="Welcome message"
          icon={MessageSquare}
          description="Where to greet new members. Pick None to send no welcome message."
          value={config.welcome}
          onChange={(welcome) => setConfig({ welcome })}
          channels={channels}
          sampleValues={sampleValues}
          errors={{
            channel: form.fieldError("welcome.channelId"),
            message: form.fieldError("welcome.message"),
          }}
        />

        <WelcomeDmCard
          dm={config.dm}
          sampleValues={sampleValues}
          error={form.fieldError("dm.message")}
          onChange={(dm) => setConfig({ dm })}
        />

        <ChannelMessageCard
          id="goodbye"
          title="Goodbye message"
          icon={UserMinus}
          description="Where to post when someone leaves. Pick None to send nothing."
          value={config.goodbye}
          onChange={(goodbye) => setConfig({ goodbye })}
          channels={channels}
          sampleValues={sampleValues}
          errors={{
            channel: form.fieldError("goodbye.channelId"),
            message: form.fieldError("goodbye.message"),
          }}
        />

        <SettingsCard title="Auto-roles" icon={UserCheck}>
          <RoleChecklist
            legend="Give new members these roles"
            hint={`Up to ${MAX_AUTO_ROLES}. Forgely can only give roles that sit below its own role in Server Settings.`}
            roles={roles}
            selected={config.autoRoleIds}
            max={MAX_AUTO_ROLES}
            onChange={(autoRoleIds) => setConfig({ autoRoleIds })}
            error={form.fieldError("autoRoleIds")}
          />
        </SettingsCard>
      </div>

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />
    </form>
  );
}

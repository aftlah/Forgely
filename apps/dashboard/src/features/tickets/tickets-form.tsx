"use client";

import { Settings2, Ticket, Users } from "lucide-react";

import { MAX_OPEN_TICKETS_PER_USER, MAX_SUPPORT_ROLES, type TicketsConfig } from "@forgely/shared";
import { Switch } from "@forgely/ui";

import { publishTicketPanelAction } from "./actions";
import { TicketPanelCard } from "./ticket-panel-card";

import { saveModuleSettingsAction } from "@/features/settings/actions";
import {
  ChannelSelect,
  NumberField,
  RoleChecklist,
  SettingsCard,
} from "@/features/settings/fields";
import type { ChannelOption, RoleOption } from "@/features/settings/guild-resources";
import { SaveBar } from "@/features/settings/save-bar";
import { useSettingsForm } from "@/features/settings/use-settings-form";

interface TicketsFormProps {
  guildId: string;
  initial: { isEnabled: boolean; config: TicketsConfig };
  channels: ChannelOption[] | null;
  categories: ChannelOption[] | null;
  roles: RoleOption[] | null;
}

function TicketsHeader({
  isEnabled,
  onChange,
}: {
  isEnabled: boolean;
  onChange: (isEnabled: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="display flex items-center gap-2.5 text-[22px]">
          <Ticket className="size-5 text-muted" aria-hidden="true" />
          Tickets
        </h2>
        <p className="mt-1 text-sm text-muted">
          Members press a button to open a private channel with your team. This switch turns the
          panel&apos;s button on or off.
        </p>
      </div>
      <Switch label="Tickets module" checked={isEnabled} onCheckedChange={onChange} />
    </div>
  );
}

export function TicketsSettingsForm({
  guildId,
  initial,
  channels,
  categories,
  roles,
}: TicketsFormProps) {
  const form = useSettingsForm(initial, (value) =>
    saveModuleSettingsAction(guildId, "tickets", value.isEnabled, value.config),
  );
  const { config } = form.draft;
  const setConfig = (patch: Partial<TicketsConfig>): void =>
    form.update({ config: { ...config, ...patch } });

  /** Saves what is on screen, then posts. Posting works from saved data, so it can only follow a save. */
  async function savePanelAndPost(): Promise<string | null> {
    const saveError = await form.save();
    if (saveError) return saveError;
    const posted = await publishTicketPanelAction(guildId).catch(() => null);
    if (!posted?.ok)
      return posted?.message ?? "Couldn't reach the server. Nothing was posted. Try again.";
    // The server wrote the posted message's reference itself, so adopt its config as saved.
    form.resetTo({ isEnabled: form.draft.isEnabled, config: posted.config });
    return null;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isDirty) void form.save();
      }}
      className="mx-auto grid max-w-[1120px] gap-6"
    >
      <TicketsHeader
        isEnabled={form.draft.isEnabled}
        onChange={(isEnabled) => form.update({ isEnabled })}
      />

      {!form.draft.isEnabled && config.panel.message && (
        <p
          role="status"
          className="rounded-md border border-warning bg-surface-overlay p-3 text-sm"
        >
          This module is off, so the panel already posted in Discord doesn&apos;t respond to clicks.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SettingsCard
          title="Setup"
          icon={Settings2}
          description="Each ticket is a private channel that only the member and your support team can see."
        >
          <ChannelSelect
            id="ticket-category"
            label="Category for new tickets"
            kind="category"
            hint="Ticket channels are created here. Required before the panel can be posted."
            value={config.categoryId}
            channels={categories}
            onChange={(categoryId) => setConfig({ categoryId })}
            error={form.fieldError("categoryId")}
          />
          <ChannelSelect
            id="ticket-log-channel"
            label="Log channel"
            hint="Posts a line when a ticket opens or closes. Pick None for no log."
            value={config.logChannelId}
            channels={channels}
            onChange={(logChannelId) => setConfig({ logChannelId })}
            error={form.fieldError("logChannelId")}
          />
          <NumberField
            id="ticket-max-open"
            label="Open tickets per member"
            hint="How many a single member can have open at once."
            min={1}
            max={MAX_OPEN_TICKETS_PER_USER}
            value={config.maxOpenPerUser}
            onChange={(maxOpenPerUser) => setConfig({ maxOpenPerUser })}
            error={form.fieldError("maxOpenPerUser")}
          />
        </SettingsCard>

        <SettingsCard title="Support team" icon={Users}>
          <RoleChecklist
            legend="Who answers tickets"
            hint={`These roles can see every ticket and are mentioned when one opens. Up to ${MAX_SUPPORT_ROLES}.`}
            roles={roles}
            selected={config.supportRoleIds}
            max={MAX_SUPPORT_ROLES}
            needsAssignable={false}
            onChange={(supportRoleIds) => setConfig({ supportRoleIds })}
            error={form.fieldError("supportRoleIds")}
          />
        </SettingsCard>
      </div>

      <TicketPanelCard
        panel={config.panel}
        channels={channels}
        hasCategory={config.categoryId !== null}
        fieldError={form.fieldError}
        onChange={(panel) => setConfig({ panel })}
        onPost={savePanelAndPost}
      />

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />
    </form>
  );
}

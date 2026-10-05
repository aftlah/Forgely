import type { Metadata } from "next";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { loadGuildResources } from "@/features/settings/guild-resources";
import { loadModuleSettings } from "@/features/settings/load-module-settings";
import { TicketsSettingsForm } from "@/features/tickets/tickets-form";

export const metadata: Metadata = { title: "Tickets settings" };

export default async function TicketsSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const [settings, resources] = await Promise.all([
    loadModuleSettings(guildId, "tickets"),
    loadGuildResources(guildId),
  ]);

  return (
    <TicketsSettingsForm
      guildId={guildId}
      initial={settings}
      channels={resources?.channels ?? null}
      categories={resources?.categories ?? null}
      roles={resources?.roles ?? null}
    />
  );
}

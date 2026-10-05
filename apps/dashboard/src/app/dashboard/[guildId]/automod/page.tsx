import type { Metadata } from "next";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { AutomodSettingsForm } from "@/features/automod/automod-form";
import { loadGuildResources } from "@/features/settings/guild-resources";
import { loadModuleSettings } from "@/features/settings/load-module-settings";

export const metadata: Metadata = { title: "Automod settings" };

export default async function AutomodSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const [settings, resources] = await Promise.all([
    loadModuleSettings(guildId, "automod"),
    loadGuildResources(guildId),
  ]);

  return (
    <AutomodSettingsForm
      guildId={guildId}
      initial={settings}
      channels={resources?.channels ?? null}
      roles={resources?.roles ?? null}
    />
  );
}

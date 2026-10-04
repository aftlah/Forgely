import type { Metadata } from "next";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { loadGuildResources } from "@/features/settings/guild-resources";
import { LevelingSettingsForm } from "@/features/settings/leveling-form";
import { loadModuleSettings } from "@/features/settings/load-module-settings";

export const metadata: Metadata = { title: "Leveling settings" };

export default async function LevelingSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const server = await requireGuildAccess(guildId);
  const [settings, resources] = await Promise.all([
    loadModuleSettings(guildId, "leveling"),
    loadGuildResources(guildId),
  ]);

  return (
    <LevelingSettingsForm
      guildId={guildId}
      serverName={server.name}
      initial={settings}
      channels={resources?.channels ?? null}
      roles={resources?.roles ?? null}
    />
  );
}

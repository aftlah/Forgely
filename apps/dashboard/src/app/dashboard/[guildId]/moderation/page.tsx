import type { Metadata } from "next";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { loadGuildResources } from "@/features/settings/guild-resources";
import { loadModuleSettings } from "@/features/settings/load-module-settings";
import { ModerationSettingsForm } from "@/features/settings/moderation-form";

export const metadata: Metadata = { title: "Moderation settings" };

export default async function ModerationSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const [settings, resources] = await Promise.all([
    loadModuleSettings(guildId, "moderation"),
    loadGuildResources(guildId),
  ]);

  return (
    <ModerationSettingsForm
      guildId={guildId}
      initial={settings}
      channels={resources?.channels ?? null}
    />
  );
}

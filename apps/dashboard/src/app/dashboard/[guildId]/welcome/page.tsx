import type { Metadata } from "next";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { loadGuildResources } from "@/features/settings/guild-resources";
import { loadModuleSettings } from "@/features/settings/load-module-settings";
import { WelcomeSettingsForm } from "@/features/settings/welcome-form";

export const metadata: Metadata = { title: "Welcome settings" };

export default async function WelcomeSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const server = await requireGuildAccess(guildId);
  const [settings, resources] = await Promise.all([
    loadModuleSettings(guildId, "welcome"),
    loadGuildResources(guildId),
  ]);

  return (
    <WelcomeSettingsForm
      guildId={guildId}
      serverName={server.name}
      initial={settings}
      channels={resources?.channels ?? null}
      roles={resources?.roles ?? null}
    />
  );
}

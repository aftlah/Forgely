import type { Metadata } from "next";

import { requireGuildAccess } from "@/features/auth/guild-access";
import { RolePanelsForm } from "@/features/role-panels/role-panels-form";
import { loadGuildResources } from "@/features/settings/guild-resources";
import { loadModuleSettings } from "@/features/settings/load-module-settings";

export const metadata: Metadata = { title: "Role panels" };

export default async function RolePanelsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const [settings, resources] = await Promise.all([
    loadModuleSettings(guildId, "role-panels"),
    loadGuildResources(guildId),
  ]);

  return (
    <RolePanelsForm
      guildId={guildId}
      initial={settings}
      channels={resources?.channels ?? null}
      roles={resources?.roles ?? null}
    />
  );
}
